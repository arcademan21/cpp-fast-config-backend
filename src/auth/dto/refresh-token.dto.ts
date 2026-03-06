import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjbTh6OXE1cWYwMDAwaDJjNmc5bjRhYjF4IiwidHlwZSI6InJlZnJlc2gifQ.signature',
    description: 'Refresh token vigente emitido por el backend.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
