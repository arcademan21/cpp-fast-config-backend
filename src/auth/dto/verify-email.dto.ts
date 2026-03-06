import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjbTh6OXE1cWYwMDAwaDJjNmc5bjRhYjF4IiwidHlwZSI6InZlcmlmeS1lbWFpbCJ9.signature',
    description: 'Token de verificacion enviado por correo.',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
