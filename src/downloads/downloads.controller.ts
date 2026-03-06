import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ConsumeDownloadResponseDto } from './dto/consume-download-response.dto';
import { ConsumeDownloadTicketDto } from './dto/consume-download-ticket.dto';
import { CreateDownloadTicketDto } from './dto/create-download-ticket.dto';
import { DownloadTicketResponseDto } from './dto/download-ticket-response.dto';
import { DownloadsService } from './downloads.service';

@ApiTags('Downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post('ticket')
  @ApiOperation({
    summary: 'Emitir ticket de descarga',
    description:
      'Valida API key del installer y emite una URL firmada efimera para descargar el artefacto solicitado.',
  })
  @ApiHeader({
    name: 'Authorization',
    required: true,
    description: 'Esquema requerido: `ApiKey <tu_api_key>`.',
    example: 'ApiKey cfk_1f72a31ac09d067f251f4d4d4728db5ec15745f4c8f9f203',
  })
  @ApiOkResponse({
    type: DownloadTicketResponseDto,
    description: 'Ticket emitido correctamente con URL firmada.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido (version, platform o arch).',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Authorization ausente o API key invalida.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'API key revocada o no autorizada.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'No existe artefacto para la combinacion solicitada.',
  })
  @ApiTooManyRequestsResponse({
    type: ErrorResponseDto,
    description: 'Rate limit excedido por API key o IP.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  createTicket(
    @Body() dto: CreateDownloadTicketDto,
    @Headers('authorization') authorization: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ip: string,
  ): Promise<DownloadTicketResponseDto> {
    return this.downloadsService.createTicket(
      dto,
      authorization,
      ip,
      userAgent,
    );
  }

  @Post('consume')
  @ApiOperation({
    summary: 'Consumir ticket de descarga',
    description:
      'Valida firma/expiracion, marca `usedAt` y devuelve la URL final del objeto para descarga.',
  })
  @ApiOkResponse({
    type: ConsumeDownloadResponseDto,
    description: 'Ticket consumido correctamente.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Firma invalida.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Ticket o firma expirados.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Ticket no encontrado.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Ticket ya consumido anteriormente.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  consumeTicket(
    @Body() dto: ConsumeDownloadTicketDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ip: string,
  ): Promise<ConsumeDownloadResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return this.downloadsService.consumeTicket(dto, ip, userAgent);
  }
}
