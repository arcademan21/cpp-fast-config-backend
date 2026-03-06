import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtifactStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateArtifactDto {
  @ApiProperty({ example: 'v1.0.0' })
  @IsString()
  @Matches(/^v?\d+\.\d+\.\d+$/)
  version!: string;

  @ApiProperty({ enum: ['darwin', 'linux', 'windows'], example: 'darwin' })
  @IsString()
  platform!: string;

  @ApiProperty({ enum: ['arm64', 'x64'], example: 'arm64' })
  @IsString()
  arch!: string;

  @ApiProperty({ example: 'cpp-fast-config-v1.0.0-darwin-arm64.tar.gz' })
  @IsString()
  filename!: string;

  @ApiProperty({
    example: 'cpp-fast-config/v1.0.0/darwin-arm64/cpp-fast-config.tar.gz',
  })
  @IsString()
  objectKey!: string;

  @ApiProperty({
    example: '9df95f5e2f8ec95f2faade6cc0f18af8fe4bd5d7ab8ff5d5c2ca4f44dfe0332e',
  })
  @IsString()
  sha256!: string;

  @ApiPropertyOptional({ example: 1830240, description: 'Tamanio en bytes.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ enum: ArtifactStatus, example: ArtifactStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ArtifactStatus)
  status?: ArtifactStatus;
}
