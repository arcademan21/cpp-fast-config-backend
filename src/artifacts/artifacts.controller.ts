import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ArtifactsService } from './artifacts.service';
import { ArtifactResponseDto } from './dto/artifact-response.dto';
import { CreateArtifactDto } from './dto/create-artifact.dto';

@ApiTags('Artifacts')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar artifact',
    description:
      'Crea o registra un artifact descargable para una combinacion version/platform/arch.',
  })
  @ApiCreatedResponse({
    type: ArtifactResponseDto,
    description: 'Artifact creado correctamente.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'Ya existe un artifact para esa combinacion version/platform/arch.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'JWT ausente o invalido.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  create(@Body() dto: CreateArtifactDto) {
    return this.artifactsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar artifacts',
    description: 'Devuelve inventario de artifacts registrados.',
  })
  @ApiOkResponse({
    type: ArtifactResponseDto,
    isArray: true,
    description: 'Listado de artifacts.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'JWT ausente o invalido.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  list() {
    return this.artifactsService.list();
  }
}
