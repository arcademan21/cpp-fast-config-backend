import { ApiProperty } from '@nestjs/swagger';
import { ArtifactStatus } from '@prisma/client';

export class ArtifactResponseDto {
  @ApiProperty({ example: 'cm8z9q5qf0000h2c6g9n4ab1x' })
  id!: string;

  @ApiProperty({ example: 'v1.0.0' })
  version!: string;

  @ApiProperty({ example: 'darwin' })
  platform!: string;

  @ApiProperty({ example: 'arm64' })
  arch!: string;

  @ApiProperty({ example: 'cpp-fast-config-v1.0.0-darwin-arm64.tar.gz' })
  filename!: string;

  @ApiProperty({
    example: 'cpp-fast-config/v1.0.0/darwin-arm64/cpp-fast-config.tar.gz',
  })
  objectKey!: string;

  @ApiProperty({
    example: '9df95f5e2f8ec95f2faade6cc0f18af8fe4bd5d7ab8ff5d5c2ca4f44dfe0332e',
  })
  sha256!: string;

  @ApiProperty({
    example: '1830240',
    nullable: true,
    description: 'BigInt serializado como string.',
  })
  size!: string | null;

  @ApiProperty({ enum: ArtifactStatus, example: ArtifactStatus.ACTIVE })
  status!: ArtifactStatus;

  @ApiProperty({ example: '2026-03-06T10:40:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-03-06T10:40:00.000Z' })
  updatedAt!: string;
}
