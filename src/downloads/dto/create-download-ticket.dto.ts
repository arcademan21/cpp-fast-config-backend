import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDownloadTicketDto {
  @ApiPropertyOptional({
    example: 'latest',
    description:
      'Version solicitada. Acepta latest o semver (v1.2.3 / 1.2.3). Si no se envia, usa latest.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^v?\d+\.\d+\.\d+$|^latest$/)
  version?: string;

  @ApiProperty({
    enum: ['darwin', 'linux', 'windows'],
    example: 'darwin',
    description: 'Sistema operativo objetivo.',
  })
  @IsString()
  @IsIn(['darwin', 'linux', 'windows'])
  platform!: string;

  @ApiProperty({
    enum: ['arm64', 'x64'],
    example: 'arm64',
    description: 'Arquitectura objetivo.',
  })
  @IsString()
  @IsIn(['arm64', 'x64'])
  arch!: string;
}
