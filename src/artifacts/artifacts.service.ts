import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { ArtifactStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtifactDto } from './dto/create-artifact.dto';

@Injectable()
export class ArtifactsService implements OnModuleInit {
  private readonly logger = new Logger(ArtifactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedCatalogFromEnv();
  }

  async create(dto: CreateArtifactDto) {
    try {
      const artifact = await this.prisma.artifact.create({
        data: {
          version: dto.version,
          platform: dto.platform,
          arch: dto.arch,
          filename: dto.filename,
          objectKey: dto.objectKey,
          sha256: dto.sha256,
          size: dto.size === undefined ? null : BigInt(dto.size),
          status: dto.status ?? ArtifactStatus.ACTIVE,
        },
      });

      return this.toResponse(artifact);
    } catch (error: unknown) {
      const msg = String(error);
      if (msg.includes('Unique constraint')) {
        throw new ConflictException(
          'Artifact already exists for version/platform/arch',
        );
      }
      throw error;
    }
  }

  list() {
    return this.prisma.artifact
      .findMany({
        orderBy: [{ createdAt: 'desc' }],
      })
      .then((items) => items.map((item) => this.toResponse(item)));
  }

  private toResponse(artifact: {
    id: string;
    version: string;
    platform: string;
    arch: string;
    filename: string;
    objectKey: string;
    sha256: string;
    size: bigint | null;
    status: ArtifactStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...artifact,
      size: artifact.size === null ? null : artifact.size.toString(),
      createdAt: artifact.createdAt.toISOString(),
      updatedAt: artifact.updatedAt.toISOString(),
    };
  }

  async resolve(version: string, platform: string, arch: string) {
    if (version === 'latest') {
      const latest = await this.prisma.artifact.findFirst({
        where: {
          platform,
          arch,
          status: ArtifactStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latest) {
        return latest;
      }

      const relaxedLatest = await this.findRelaxedMatch([version], platform);
      if (relaxedLatest) {
        return relaxedLatest;
      }

      const fallbackVersion = this.configService
        .get<string>('ARTIFACT_AUTO_DISCOVERY_VERSION', '')
        .trim();

      if (fallbackVersion) {
        const hydrated = await this.tryHydrateFromStorage(
          fallbackVersion,
          platform,
          arch,
        );
        if (hydrated) {
          return hydrated;
        }
      }

      return null;
    }

    const exact = await this.prisma.artifact.findFirst({
      where: {
        version,
        platform,
        arch,
        status: ArtifactStatus.ACTIVE,
      },
    });

    if (exact) {
      return exact;
    }

    const hydratedExact = await this.tryHydrateFromStorage(version, platform, arch);
    if (hydratedExact) {
      return hydratedExact;
    }

    const alternateVersion = this.toAlternateSemver(version);
    if (!alternateVersion) {
      return this.findRelaxedMatch([version], platform);
    }

    const alternate = await this.prisma.artifact.findFirst({
      where: {
        version: alternateVersion,
        platform,
        arch,
        status: ArtifactStatus.ACTIVE,
      },
    });

    if (alternate) {
      return alternate;
    }

    const hydratedAlternate = await this.tryHydrateFromStorage(
      alternateVersion,
      platform,
      arch,
    );
    if (hydratedAlternate) {
      return hydratedAlternate;
    }

    return this.findRelaxedMatch([version, alternateVersion], platform);
  }

  private async findRelaxedMatch(
    versions: string[],
    requestedPlatform: string,
  ) {
    const relaxedMatchingEnabled = this.configService.get<string>(
      'ARTIFACT_RELAXED_MATCHING_ENABLED',
      'false',
    );

    if (relaxedMatchingEnabled.toLowerCase() === 'false') {
      return null;
    }

    const filteredVersions = versions.filter((value) => value && value !== 'latest');
    if (filteredVersions.length > 0) {
      const samePlatformAnyArch = await this.prisma.artifact.findFirst({
        where: {
          version: { in: filteredVersions },
          platform: requestedPlatform,
          status: ArtifactStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (samePlatformAnyArch) {
        this.logger.warn(
          `Relaxed artifact match used (same platform, any arch): requested versions=[${filteredVersions.join(',')}] platform=${requestedPlatform} -> resolved ${samePlatformAnyArch.version}/${samePlatformAnyArch.platform}/${samePlatformAnyArch.arch}`,
        );
        return samePlatformAnyArch;
      }

      const anyPlatformAnyArch = await this.prisma.artifact.findFirst({
        where: {
          version: { in: filteredVersions },
          status: ArtifactStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (anyPlatformAnyArch) {
        this.logger.warn(
          `Relaxed artifact match used (any target): requested versions=[${filteredVersions.join(',')}] -> resolved ${anyPlatformAnyArch.version}/${anyPlatformAnyArch.platform}/${anyPlatformAnyArch.arch}`,
        );
        return anyPlatformAnyArch;
      }
    }

    return this.prisma.artifact.findFirst({
      where: { status: ArtifactStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async tryHydrateFromStorage(
    version: string,
    platform: string,
    arch: string,
  ) {
    const autoDiscoveryEnabled = this.configService.get<string>(
      'ARTIFACT_AUTO_DISCOVERY_ENABLED',
      'true',
    );

    if (autoDiscoveryEnabled.toLowerCase() === 'false') {
      return null;
    }

    const candidateVersions = this.buildCandidateVersions(version);
    for (const candidateVersion of candidateVersions) {
      const existing = await this.prisma.artifact.findFirst({
        where: {
          version: candidateVersion,
          platform,
          arch,
          status: ArtifactStatus.ACTIVE,
        },
      });

      if (existing) {
        return existing;
      }

      const objectKey = this.buildObjectKey(candidateVersion, platform, arch);
      const metadata = await this.fetchArtifactMetadata(objectKey);
      if (!metadata) {
        continue;
      }

      const filename =
        objectKey.split('/').pop() ??
        `cpp-fast-config-${candidateVersion}-${platform}-${arch}.tar.gz`;

      const artifact = await this.prisma.artifact.upsert({
        where: {
          version_platform_arch: {
            version: candidateVersion,
            platform,
            arch,
          },
        },
        update: {
          filename,
          objectKey,
          sha256: metadata.sha256,
          size: BigInt(metadata.size),
          status: ArtifactStatus.ACTIVE,
        },
        create: {
          version: candidateVersion,
          platform,
          arch,
          filename,
          objectKey,
          sha256: metadata.sha256,
          size: BigInt(metadata.size),
          status: ArtifactStatus.ACTIVE,
        },
      });

      this.logger.log(
        `Artifact auto-discovered and hydrated: ${candidateVersion}/${platform}/${arch}`,
      );

      return artifact;
    }

    return null;
  }

  private buildCandidateVersions(version: string): string[] {
    const values = [version];
    const alternate = this.toAlternateSemver(version);
    if (alternate && alternate !== version) {
      values.push(alternate);
    }
    return values;
  }

  private buildObjectKey(version: string, platform: string, arch: string) {
    const pattern = this.configService.get<string>(
      'ARTIFACT_OBJECT_KEY_PATTERN',
      'cpp-fast-config/{version}/{platform}-{arch}/cpp-fast-config.tar.gz',
    );

    return pattern
      .replace('{version}', version)
      .replace('{platform}', platform)
      .replace('{arch}', arch);
  }

  private async fetchArtifactMetadata(
    objectKey: string,
  ): Promise<{ sha256: string; size: number } | null> {
    const baseUrl = this.configService
      .get<string>('DOWNLOAD_BASE_URL', '')
      .trim();
    if (!baseUrl) {
      return null;
    }

    const artifactUrl = `${baseUrl.replace(/\/$/, '')}/${objectKey}`;
    const timeoutMs = Number(
      this.configService.get<string>(
        'ARTIFACT_AUTO_DISCOVERY_TIMEOUT_MS',
        '15000',
      ),
    );

    return new Promise((resolve) => {
      const maxRedirects = 5;
      const visited = new Set<string>();

      const requestUrl = (urlValue: string, redirects: number) => {
        if (redirects > maxRedirects || visited.has(urlValue)) {
          resolve(null);
          return;
        }

        visited.add(urlValue);
        const requester = urlValue.startsWith('https://') ? httpsGet : httpGet;

        const req = requester(urlValue, (res) => {
          const statusCode = res.statusCode ?? 0;
          const location = res.headers.location;

          if (location && statusCode >= 300 && statusCode < 400) {
            res.resume();
            const nextUrl = new URL(location, urlValue).toString();
            requestUrl(nextUrl, redirects + 1);
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            res.resume();
            resolve(null);
            return;
          }

          const hash = createHash('sha256');
          let size = 0;

          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            hash.update(chunk);
          });

          res.on('end', () => {
            resolve({
              sha256: hash.digest('hex'),
              size,
            });
          });

          res.on('error', () => {
            resolve(null);
          });
        });

        req.setTimeout(timeoutMs, () => {
          req.destroy();
          resolve(null);
        });

        req.on('error', () => {
          resolve(null);
        });
      };

      requestUrl(artifactUrl, 0);
    });
  }

  private toAlternateSemver(version: string): string | null {
    const trimmed = version.trim();
    const semverNoPrefix = /^\d+\.\d+\.\d+$/;
    const semverWithPrefix = /^v\d+\.\d+\.\d+$/;

    if (semverWithPrefix.test(trimmed)) {
      return trimmed.slice(1);
    }

    if (semverNoPrefix.test(trimmed)) {
      return `v${trimmed}`;
    }

    return null;
  }

  private async seedCatalogFromEnv() {
    const rawSeed = this.configService
      .get<string>('ARTIFACT_CATALOG_SEED_JSON', '')
      .trim();

    if (!rawSeed) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawSeed);
    } catch (error) {
      this.logger.warn(
        'ARTIFACT_CATALOG_SEED_JSON is not valid JSON; skipping seed.',
      );
      this.logger.debug(String(error));
      return;
    }

    if (!Array.isArray(parsed)) {
      this.logger.warn(
        'ARTIFACT_CATALOG_SEED_JSON must be a JSON array; skipping seed.',
      );
      return;
    }

    let applied = 0;
    for (const item of parsed) {
      if (!this.isSeedItem(item)) {
        continue;
      }

      const existing = await this.prisma.artifact.findFirst({
        where: {
          version: item.version,
          platform: item.platform,
          arch: item.arch,
        },
      });

      const data = {
        version: item.version,
        platform: item.platform,
        arch: item.arch,
        filename: item.filename,
        objectKey: item.objectKey,
        sha256: item.sha256,
        size: item.size === undefined ? null : BigInt(item.size),
        status: item.status ?? ArtifactStatus.ACTIVE,
      };

      if (existing) {
        await this.prisma.artifact.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.artifact.create({
          data,
        });
      }

      applied += 1;
    }

    if (applied > 0) {
      this.logger.log(`Artifact catalog seed applied: ${applied} entries.`);
    }
  }

  private isSeedItem(item: unknown): item is {
    version: string;
    platform: string;
    arch: string;
    filename: string;
    objectKey: string;
    sha256: string;
    size?: number;
    status?: ArtifactStatus;
  } {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const candidate = item as Record<string, unknown>;

    const requiredStringFields = [
      'version',
      'platform',
      'arch',
      'filename',
      'objectKey',
      'sha256',
    ] as const;

    for (const field of requiredStringFields) {
      if (
        typeof candidate[field] !== 'string' ||
        candidate[field].trim() === ''
      ) {
        return false;
      }
    }

    if (
      candidate.size !== undefined &&
      (!Number.isInteger(candidate.size) || (candidate.size as number) < 0)
    ) {
      return false;
    }

    if (
      candidate.status !== undefined &&
      candidate.status !== ArtifactStatus.ACTIVE &&
      candidate.status !== ArtifactStatus.DISABLED
    ) {
      return false;
    }

    return true;
  }
}
