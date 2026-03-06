import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'dev@cppfastconfig.dev',
    description: 'Email registrado del usuario.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 8,
    example: 'MyStrongPass123',
    description: 'Password del usuario.',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
