import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class ConsumeDownloadTicketDto {
  @ApiProperty({
    example: 'cm8z9q5qf0000h2c6g9n4ab1x',
    description: 'ID del ticket emitido por /downloads/ticket.',
  })
  @IsString()
  ticket!: string;

  @ApiProperty({
    example: 1770000000,
    description: 'Epoch seconds de expiracion enviado en la URL firmada.',
  })
  @IsInt()
  @Min(1)
  exp!: number;

  @ApiProperty({
    example: 'f51c0f91b2377c860339dd143ec9580dd7119fd3830f885f7f7a6e4ad94f5bf3',
    description: 'Firma HMAC SHA-256 asociada al ticket y expiracion.',
  })
  @IsString()
  sig!: string;
}
