import { Controller, Post, Body, Delete, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AGENDA_SYNC_SIGNATURE_HEADER, AGENDA_SYNC_TIMESTAMP_HEADER } from 'src/constants';
import { HttpErrorResponseDto, ValidationErrorResponseDto } from 'src/lib';
import { DatesService } from '../service/dates.service';
import { AgendaSyncGuard } from '../guards/agenda-sync.guard';
import { DatesManualGuard } from '../guards/dates-manual.guard';
import { CreateXDatesDto } from '../dto/create-x-dates.dto';
import { EnsureAgendaWindowResponseDto } from '../dto/ensure-agenda-window-response.dto';

@Controller('dates')
@ApiTags('Dates')
export class DatesController {
  constructor(private readonly datesService: DatesService) {}

  @Post()
  @UseGuards(DatesManualGuard)
  @ApiOperation({
    summary: 'Crear un nuevo dia manualmente',
    description: 'Agrega un nuevo dia de agenda de forma manual para tareas operativas.',
  })
  @ApiSecurity('agenda-sync-timestamp')
  @ApiSecurity('agenda-sync-signature')
  @ApiHeader({
    name: AGENDA_SYNC_TIMESTAMP_HEADER,
    description: 'Timestamp utilizado para validar la ventana temporal de la firma HMAC.',
    required: true,
  })
  @ApiHeader({
    name: AGENDA_SYNC_SIGNATURE_HEADER,
    description: 'Firma HMAC calculada sobre metodo, path y timestamp del request.',
    required: true,
  })
  @ApiOkResponse({
    description: 'Resultado textual de la creacion manual del dia.',
    schema: {
      type: 'string',
      example: 'Se agrego el dia domingo 01 de marzo 2030',
    },
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo headers validos o supero la proteccion del guard.',
    type: HttpErrorResponseDto,
  })
  create(): Promise<string> {
    return this.datesService.createDate();
  }

  @Post('/next-date')
  @UseGuards(DatesManualGuard)
  @ApiOperation({
    summary: 'Crear el proximo dia faltante',
    description: 'Agrega manualmente el siguiente dia consecutivo en la agenda.',
  })
  @ApiSecurity('agenda-sync-timestamp')
  @ApiSecurity('agenda-sync-signature')
  @ApiHeader({
    name: AGENDA_SYNC_TIMESTAMP_HEADER,
    description: 'Timestamp utilizado para validar la ventana temporal de la firma HMAC.',
    required: true,
  })
  @ApiHeader({
    name: AGENDA_SYNC_SIGNATURE_HEADER,
    description: 'Firma HMAC calculada sobre metodo, path y timestamp del request.',
    required: true,
  })
  @ApiOkResponse({
    description: 'Resultado textual de la creacion del siguiente dia.',
    schema: {
      type: 'string',
      example: 'Se agrego el dia lunes 02 de marzo 2030',
    },
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo headers validos o supero la proteccion del guard.',
    type: HttpErrorResponseDto,
  })
  createNextDate(): Promise<string> {
    return this.datesService.createNextDate();
  }

  @Post('/x-dates')
  @UseGuards(DatesManualGuard)
  @ApiOperation({
    summary: 'Crear multiples dias manualmente',
    description: 'Genera una cantidad arbitraria de dias futuros de agenda.',
  })
  @ApiSecurity('agenda-sync-timestamp')
  @ApiSecurity('agenda-sync-signature')
  @ApiHeader({
    name: AGENDA_SYNC_TIMESTAMP_HEADER,
    description: 'Timestamp utilizado para validar la ventana temporal de la firma HMAC.',
    required: true,
  })
  @ApiHeader({
    name: AGENDA_SYNC_SIGNATURE_HEADER,
    description: 'Firma HMAC calculada sobre metodo, path y timestamp del request.',
    required: true,
  })
  @ApiBody({
    type: CreateXDatesDto,
    description: 'Cantidad de dias que se desea agregar manualmente a la agenda.',
  })
  @ApiOkResponse({
    description: 'Resultado textual de la creacion de dias.',
    schema: {
      type: 'string',
      example: 'Se agregaron 3 dias',
    },
  })
  @ApiBadRequestResponse({
    description: 'El body no contiene una cantidad valida de dias.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo headers validos o supero la proteccion del guard.',
    type: HttpErrorResponseDto,
  })
  createXDates(@Body() createXDatesDto: CreateXDatesDto): Promise<string> {
    return this.datesService.createXDates(createXDatesDto.quantity);
  }

  @Post('/ensure-agenda-window')
  @UseGuards(AgendaSyncGuard)
  @ApiOperation({
    summary: 'Asegurar ventana futura de agenda',
    description:
      'Endpoint operativo firmado que verifica la cobertura futura y crea solo los dias faltantes.',
  })
  @ApiSecurity('agenda-sync-timestamp')
  @ApiSecurity('agenda-sync-signature')
  @ApiHeader({
    name: AGENDA_SYNC_TIMESTAMP_HEADER,
    description: 'Timestamp utilizado para validar la ventana temporal de la firma HMAC.',
    required: true,
  })
  @ApiHeader({
    name: AGENDA_SYNC_SIGNATURE_HEADER,
    description: 'Firma HMAC calculada sobre metodo, path y timestamp del request.',
    required: true,
  })
  @ApiOkResponse({
    description: 'Resultado detallado de la sincronizacion de la ventana de agenda.',
    type: EnsureAgendaWindowResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo headers validos o supero la proteccion del guard.',
    type: HttpErrorResponseDto,
  })
  ensureAgendaWindow(): Promise<EnsureAgendaWindowResponseDto> {
    return this.datesService.ensureAgendaWindow();
  }

  @Delete('/delete-old-rows')
  @UseGuards(AgendaSyncGuard)
  @ApiOperation({
    summary: 'Eliminar filas historicas antiguas',
    description:
      'Endpoint operativo firmado para borrar filas fuera de la ventana de retencion configurada.',
  })
  @ApiSecurity('agenda-sync-timestamp')
  @ApiSecurity('agenda-sync-signature')
  @ApiHeader({
    name: AGENDA_SYNC_TIMESTAMP_HEADER,
    description: 'Timestamp utilizado para validar la ventana temporal de la firma HMAC.',
    required: true,
  })
  @ApiHeader({
    name: AGENDA_SYNC_SIGNATURE_HEADER,
    description: 'Firma HMAC calculada sobre metodo, path y timestamp del request.',
    required: true,
  })
  @ApiOkResponse({
    description: 'Resultado textual del proceso de limpieza de filas antiguas.',
    schema: {
      type: 'string',
      nullable: true,
      example: 'Se eliminaron 25 filas antiguas de la agenda.',
    },
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo headers validos o supero la proteccion del guard.',
    type: HttpErrorResponseDto,
  })
  deleteOldRows(): Promise<string | undefined> {
    return this.datesService.deleteOldRows();
  }
}
