import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ApiKeyCreatedDto, ApiKeyDto } from './dto/api-key-response.dto';
import { ApiKeysService } from './api-keys.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
  };
};

@ApiTags('API Keys')
@ApiBearerAuth('bearer')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear API key',
    description:
      'Genera una nueva API key para uso del installer/broker. La key completa solo se devuelve una vez.',
  })
  @ApiOkResponse({
    type: ApiKeyCreatedDto,
    description: 'API key creada.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'JWT ausente o invalido.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  create(@Req() req: AuthenticatedRequest) {
    return this.apiKeysService.createKey(req.user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar API keys',
    description:
      'Lista keys del usuario autenticado (sin exponer el valor completo).',
  })
  @ApiOkResponse({
    type: ApiKeyDto,
    isArray: true,
    description: 'Listado de API keys del usuario.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'JWT ausente o invalido.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  list(@Req() req: AuthenticatedRequest) {
    return this.apiKeysService.listKeys(req.user.userId);
  }

  @Post(':id/revoke')
  @ApiOperation({
    summary: 'Revocar API key',
    description: 'Revoca una API key existente del usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador interno de la API key.',
    example: 'cm8za6r8a0001h2c6s2yx1n8k',
  })
  @ApiOkResponse({
    type: ApiKeyDto,
    description: 'API key revocada.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Parametro id invalido o mal formado.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'JWT ausente o invalido.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.apiKeysService.revokeKey(req.user.userId, id);
  }

  @Post(':id/rotate')
  @ApiOperation({
    summary: 'Rotar API key',
    description:
      'Revoca la key actual y crea una nueva key activa para el mismo usuario.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador interno de la API key a rotar.',
    example: 'cm8za6r8a0001h2c6s2yx1n8k',
  })
  @ApiOkResponse({
    type: ApiKeyCreatedDto,
    description:
      'API key rotada correctamente. La key completa solo se devuelve en esta respuesta.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Parametro id invalido o mal formado.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'JWT ausente o invalido.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  rotate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.apiKeysService.rotateKey(req.user.userId, id);
  }
}
