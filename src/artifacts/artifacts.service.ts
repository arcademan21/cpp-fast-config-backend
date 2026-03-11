import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      return this.prisma.artifact.findFirst({
        where: {
          platform,
          arch,
          status: ArtifactStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });
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

    const alternateVersion = this.toAlternateSemver(version);
    if (!alternateVersion) {
      return null;
    }

    return this.prisma.artifact.findFirst({
      where: {
        version: alternateVersion,
        platform,
        arch,
        status: ArtifactStatus.ACTIVE,
      },
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
