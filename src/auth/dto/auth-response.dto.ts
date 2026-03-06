import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'cm8z9q5qf0000h2c6g9n4ab1x' })
  id!: string;

  @ApiProperty({ example: 'dev@cppfastconfig.dev' })
  email!: string;

  @ApiProperty({ example: false })
  emailVerified!: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VySWQiLCJlbWFpbCI6ImRldkBjcHBmYXN0Y29uZmlnLmRldiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwOTAwfQ.signature',
  })
  accessToken!: string;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VySWQiLCJlbWFpbCI6ImRldkBjcHBmYXN0Y29uZmlnLmRldiIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDA2MDQ4MDB9.signature',
  })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
