import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('Broker Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const userEmails: string[] = [];
  const artifactVersions: string[] = [];

  const sha256 =
    '9df95f5e2f8ec95f2faade6cc0f18af8fe4bd5d7ab8ff5d5c2ca4f44dfe0332e';

  async function createUserAndLogin() {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-${suffix}@cppfastconfig.dev`;
    const password = 'MyStrongPass123';
    userEmails.push(email);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);

    return {
      email,
      jwt: loginRes.body.accessToken as string,
    };
  }

  async function registerArtifact(jwt: string) {
    const version = `v1.0.${Date.now()}${Math.floor(Math.random() * 1000)}`;
    artifactVersions.push(version);

    await request(app.getHttpServer())
      .post('/api/artifacts')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        version,
        platform: 'darwin',
        arch: 'arm64',
        filename: `cpp-fast-config-${version}-darwin-arm64.tar.gz`,
        objectKey: `cpp-fast-config/${version}/darwin-arm64/cpp-fast-config.tar.gz`,
        sha256,
        size: 1830240,
      })
      .expect(201);

    return version;
  }

  async function createApiKey(jwt: string) {
    const createKeyRes = await request(app.getHttpServer())
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(201);

    return createKeyRes.body.key as string;
  }

  beforeAll(async () => {
    jest.setTimeout(30000);
    process.env.DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS = '3600';
    process.env.DOWNLOAD_RATE_LIMIT_KEY_MAX = '1';
    process.env.DOWNLOAD_RATE_LIMIT_IP_MAX = '1000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (userEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: userEmails } } });
    }
    if (artifactVersions.length > 0) {
      await prisma.artifact.deleteMany({
        where: { version: { in: artifactVersions } },
      });
    }
    await app.close();
  });

  it('runs complete broker flow and rejects second consume', async () => {
    const { jwt } = await createUserAndLogin();
    expect(jwt).toBeTruthy();

    const version = await registerArtifact(jwt);
    const apiKey = await createApiKey(jwt);
    expect(apiKey).toMatch(/^cfk_/);

    const ticketRes = await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ version, platform: 'darwin', arch: 'arm64' })
      .expect(201);

    const downloadUrl = new URL(ticketRes.body.downloadUrl as string);
    const ticket = downloadUrl.searchParams.get('ticket');
    const exp = downloadUrl.searchParams.get('exp');
    const sig = downloadUrl.searchParams.get('sig');

    expect(ticket).toBeTruthy();
    expect(exp).toBeTruthy();
    expect(sig).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/downloads/consume')
      .send({ ticket, exp: Number(exp), sig })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/downloads/consume')
      .send({ ticket, exp: Number(exp), sig })
      .expect(409);
  });

  it('returns 429 when ticket requests exceed key limit', async () => {
    const { jwt } = await createUserAndLogin();
    const version = await registerArtifact(jwt);
    const apiKey = await createApiKey(jwt);

    await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ version, platform: 'darwin', arch: 'arm64' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ version, platform: 'darwin', arch: 'arm64' })
      .expect(429);
  });

  it('returns 401 when consume signature is invalid', async () => {
    const { jwt } = await createUserAndLogin();
    const version = await registerArtifact(jwt);
    const apiKey = await createApiKey(jwt);

    const ticketRes = await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ version, platform: 'darwin', arch: 'arm64' })
      .expect(201);

    const downloadUrl = new URL(ticketRes.body.downloadUrl as string);
    const ticket = downloadUrl.searchParams.get('ticket');
    const exp = downloadUrl.searchParams.get('exp');

    await request(app.getHttpServer())
      .post('/api/downloads/consume')
      .send({
        ticket,
        exp: Number(exp),
        sig: 'invalidsignature',
      })
      .expect(401);
  });

  it('returns 401 when API key header is missing on ticket request', async () => {
    await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .send({ version: 'latest', platform: 'darwin', arch: 'arm64' })
      .expect(401);
  });

  it('returns 404 when artifact is not found for requested target', async () => {
    const { jwt } = await createUserAndLogin();
    const apiKey = await createApiKey(jwt);

    await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({
        version: 'v9.9.9',
        platform: 'darwin',
        arch: 'arm64',
      })
      .expect(404);
  });

  it('returns 403 when API key was revoked', async () => {
    const { jwt } = await createUserAndLogin();
    const version = await registerArtifact(jwt);

    const createKeyRes = await request(app.getHttpServer())
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(201);

    const keyId = createKeyRes.body.id as string;
    const apiKey = createKeyRes.body.key as string;

    await request(app.getHttpServer())
      .post(`/api/api-keys/${keyId}/revoke`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ version, platform: 'darwin', arch: 'arm64' })
      .expect(403);
  });

  it('returns 403 when ticket is expired', async () => {
    const { jwt } = await createUserAndLogin();
    const version = await registerArtifact(jwt);
    const apiKey = await createApiKey(jwt);

    const ticketRes = await request(app.getHttpServer())
      .post('/api/downloads/ticket')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ version, platform: 'darwin', arch: 'arm64' })
      .expect(201);

    const downloadUrl = new URL(ticketRes.body.downloadUrl as string);
    const ticket = downloadUrl.searchParams.get('ticket') as string;
    const exp = downloadUrl.searchParams.get('exp');
    const sig = downloadUrl.searchParams.get('sig');

    await prisma.downloadTicket.update({
      where: { id: ticket },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await request(app.getHttpServer())
      .post('/api/downloads/consume')
      .send({ ticket, exp: Number(exp), sig })
      .expect(403);
  });

  it('returns 404 when consuming unknown ticket', async () => {
    await request(app.getHttpServer())
      .post('/api/downloads/consume')
      .send({
        ticket: 'cm_unknown_ticket',
        exp: Math.floor(Date.now() / 1000) + 120,
        sig: 'abc',
      })
      .expect(404);
  });

  it('returns health check', () => {
    return request(app.getHttpServer())
      .get('/api/')
      .expect(200)
      .expect('Hello World!');
  });
});
