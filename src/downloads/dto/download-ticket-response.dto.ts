import { ApiProperty } from '@nestjs/swagger';

export class DownloadTicketResponseDto {
  @ApiProperty({ example: 'cpp-fast-config-v1.0.0-darwin-arm64.tar.gz' })
  artifact!: string;

  @ApiProperty({ example: 'v1.0.0' })
  version!: string;

  @ApiProperty({
    example: '9df95f5e2f8ec95f2faade6cc0f18af8fe4bd5d7ab8ff5d5c2ca4f44dfe0332e',
  })
  sha256!: string;

  @ApiProperty({
    example:
      'https://downloads.example.com/cpp-fast-config/v1.0.0/darwin-arm64/cpp-fast-config.tar.gz?ticket=abc123&exp=1770000000&sig=signature',
  })
  downloadUrl!: string;

  @ApiProperty({ example: '2026-03-06T10:28:00.000Z' })
  expiresAt!: string;
}
