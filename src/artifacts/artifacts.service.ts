import { ConflictException, Injectable } from '@nestjs/common';
import { ArtifactStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtifactDto } from './dto/create-artifact.dto';

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.artifact.findFirst({
      where: {
        version,
        platform,
        arch,
        status: ArtifactStatus.ACTIVE,
      },
    });
  }
}
