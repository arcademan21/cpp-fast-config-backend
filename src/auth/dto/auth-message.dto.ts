import { ApiProperty } from '@nestjs/swagger';

export class AuthMessageDto {
  @ApiProperty({ example: 'Operation completed successfully.' })
  message!: string;
}
