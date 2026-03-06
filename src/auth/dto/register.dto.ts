import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'dev@cppfastconfig.dev',
    description: 'Email unico del usuario.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 8,
    example: 'MyStrongPass123',
    description: 'Password de acceso (minimo 8 caracteres).',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
