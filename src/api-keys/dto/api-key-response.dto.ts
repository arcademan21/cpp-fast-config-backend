import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyDto {
  @ApiProperty({ example: 'cm8za6r8a0001h2c6s2yx1n8k' })
  id!: string;

  @ApiProperty({ example: 'cfk_89af4f8f' })
  prefix!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: 'ACTIVE' | 'REVOKED';

  @ApiProperty({ example: '2026-03-06T10:23:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    nullable: true,
    example: '2026-03-06T10:40:00.000Z',
    description: 'Fecha del ultimo uso de la key.',
  })
  lastUsedAt?: string | null;
}

export class ApiKeyCreatedDto extends ApiKeyDto {
  @ApiProperty({
    example: 'cfk_1f72a31ac09d067f251f4d4d4728db5ec15745f4c8f9f203',
    description:
      'La key completa solo se devuelve una vez al crearla. Guardarla de forma segura.',
  })
  key!: string;
}
