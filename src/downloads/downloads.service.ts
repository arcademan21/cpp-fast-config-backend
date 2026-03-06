import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { ApiKeyStatus, DownloadResult } from '@prisma/client';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsumeDownloadResponseDto } from './dto/consume-download-response.dto';
import { CreateDownloadTicketDto } from './dto/create-download-ticket.dto';
import { ConsumeDownloadTicketDto } from './dto/consume-download-ticket.dto';
import { DownloadTicketResponseDto } from './dto/download-ticket-response.dto';

@Injectable()
export class DownloadsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly apiKeysService: ApiKeysService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  async createTicket(
    dto: CreateDownloadTicketDto,
    authorizationHeader: string | undefined,
    ip?: string,
    userAgent?: string,
  ): Promise<DownloadTicketResponseDto> {
    const rawKey = this.parseApiKeyHeader(authorizationHeader);
    const apiKey = await this.apiKeysService.findActiveByRawKey(rawKey);

    if (!apiKey) {
      await this.prisma.downloadEvent.create({
        data: {
          ip,
          userAgent,
          result: DownloadResult.INVALID_KEY,
        },
      });
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.status !== ApiKeyStatus.ACTIVE) {
      await this.prisma.downloadEvent.create({
        data: {
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          ip,
          userAgent,
          result: DownloadResult.KEY_REVOKED,
        },
      });
      throw new ForbiddenException('API key revoked');
    }

    await this.enforceRateLimit(apiKey.id, apiKey.userId, ip, userAgent);

    const version = dto.version ?? 'latest';
    const artifact = await this.artifactsService.resolve(
      version,
      dto.platform,
      dto.arch,
    );

    if (!artifact) {
      await this.prisma.downloadEvent.create({
        data: {
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          ip,
          userAgent,
          result: DownloadResult.ARTIFACT_NOT_FOUND,
        },
      });
      throw new NotFoundException('Artifact not found for requested target');
    }

    const ttlSeconds = this.configService.get<number>(
      'DOWNLOAD_TTL_SECONDS',
      300,
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const ticket = await this.prisma.downloadTicket.create({
      data: {
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        artifactId: artifact.id,
        ip,
        expiresAt,
      },
    });

    await this.prisma.downloadEvent.create({
      data: {
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        artifactId: artifact.id,
        ip,
        userAgent,
        result: DownloadResult.SUCCESS,
      },
    });

    await this.apiKeysService.markKeyUsed(apiKey.id);

    const downloadUrl = this.buildSignedDownloadUrl(
      ticket.id,
      artifact.objectKey,
      expiresAt,
    );

    return {
      artifact: artifact.filename,
      version: artifact.version,
      sha256: artifact.sha256,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async consumeTicket(
    dto: ConsumeDownloadTicketDto,
    ip?: string,
    userAgent?: string,
  ): Promise<ConsumeDownloadResponseDto> {
    const ticket = await this.prisma.downloadTicket.findUnique({
      where: { id: dto.ticket },
      include: {
        artifact: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.usedAt) {
      throw new ConflictException('Ticket already used');
    }

    const now = new Date();
    if (ticket.expiresAt.getTime() < now.getTime()) {
      throw new ForbiddenException('Ticket expired');
    }

    const expDate = new Date(dto.exp * 1000);
    if (expDate.getTime() < now.getTime()) {
      throw new ForbiddenException('Signed URL expired');
    }

    const expectedSig = this.computeSignature(
      dto.ticket,
      ticket.artifact.objectKey,
      dto.exp,
    );
    if (expectedSig !== dto.sig) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.prisma.downloadTicket.update({
      where: { id: ticket.id },
      data: { usedAt: now },
    });

    await this.prisma.downloadEvent.create({
      data: {
        userId: ticket.userId,
        apiKeyId: ticket.apiKeyId,
        artifactId: ticket.artifactId,
        ip,
        userAgent,
        result: DownloadResult.SUCCESS,
      },
    });

    return {
      artifact: ticket.artifact.filename,
      version: ticket.artifact.version,
      sha256: ticket.artifact.sha256,
      resolvedUrl: this.buildObjectUrl(ticket.artifact.objectKey),
      consumedAt: now.toISOString(),
    };
  }

  private parseApiKeyHeader(header: string | undefined): string {
    if (!header) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, rawKey] = header.split(' ');
    if (scheme !== 'ApiKey' || !rawKey) {
      throw new UnauthorizedException('Authorization must use ApiKey scheme');
    }

    return rawKey.trim();
  }

  private buildSignedDownloadUrl(
    ticketId: string,
    objectKey: string,
    expiresAt: Date,
  ) {
    const base = this.buildObjectUrl(objectKey);
    const exp = Math.floor(expiresAt.getTime() / 1000);
    const sig = this.computeSignature(ticketId, objectKey, exp);

    return `${base}?ticket=${ticketId}&exp=${exp}&sig=${sig}`;
  }

  private computeSignature(ticketId: string, objectKey: string, exp: number) {
    const secret = this.configService.get<string>(
      'DOWNLOAD_URL_SIGNING_SECRET',
      'dev-signing-secret',
    );
    const payload = `${ticketId}:${objectKey}:${exp}`;
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private buildObjectUrl(objectKey: string) {
    const base = this.configService.get<string>(
      'DOWNLOAD_BASE_URL',
      'https://downloads.example.com',
    );
    return `${base.replace(/\/$/, '')}/${objectKey}`;
  }

  private async enforceRateLimit(
    apiKeyId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const windowSeconds = this.configService.get<number>(
      'DOWNLOAD_RATE_LIMIT_WINDOW_SECONDS',
      3600,
    );
    const maxPerKey = this.configService.get<number>(
      'DOWNLOAD_RATE_LIMIT_KEY_MAX',
      20,
    );
    const maxPerIp = this.configService.get<number>(
      'DOWNLOAD_RATE_LIMIT_IP_MAX',
      60,
    );
    const windowStart = new Date(Date.now() - windowSeconds * 1000);

    const keyCount = await this.prisma.downloadEvent.count({
      where: {
        apiKeyId,
        createdAt: { gte: windowStart },
      },
    });

    const ipCount =
      ip === undefined
        ? 0
        : await this.prisma.downloadEvent.count({
            where: {
              ip,
              createdAt: { gte: windowStart },
            },
          });

    if (keyCount >= maxPerKey || ipCount >= maxPerIp) {
      await this.prisma.downloadEvent.create({
        data: {
          userId,
          apiKeyId,
          ip,
          userAgent,
          result: DownloadResult.RATE_LIMITED,
        },
      });

      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
