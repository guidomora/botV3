import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { INTERNAL_API_TOKEN_HEADER } from 'src/constants';
import { HttpErrorResponseDto, ValidationErrorResponseDto } from 'src/lib';
import { ReservationsDashboardService } from '../service/reservations-dashboard.service';
import { AvailableReservationDatesResponseDto } from '../dto/available-reservation-dates-response.dto';
import { DailyReservationSlotsResponseDto } from '../dto/daily-reservation-slots-response.dto';
import { DailyReservationsSummaryResponseDto } from '../dto/daily-reservations-summary-response.dto';
import { GetDailyReservationsSummaryQueryDto } from '../dto/get-daily-reservations-summary-query.dto';
import { InternalApiTokenGuard } from '../guards/internal-api-token.guard';
import { UpdateDashboardReservationDto } from '../dto/update-dashboard-reservation.dto';
import { UpdateDashboardReservationResponseDto } from '../dto/update-dashboard-reservation-response.dto';
import { DeleteDashboardReservationDto } from '../dto/delete-dashboard-reservation.dto';
import { DeleteDashboardReservationResponseDto } from '../dto/delete-dashboard-reservation-response.dto';
import { CreateDashboardReservationDto } from '../dto/create-dashboard-reservation.dto';
import { CreateDashboardReservationResponseDto } from '../dto/create-dashboard-reservation-response.dto';
import { ReservationClosedDayParamDto } from '../dto/reservation-closed-day-param.dto';
import { CloseDashboardDayDto } from '../dto/close-dashboard-day.dto';
import { CloseDashboardDayResponseDto } from '../dto/close-dashboard-day-response.dto';
import { CloseDashboardSlotDto } from '../dto/close-dashboard-slot.dto';
import { CloseDashboardSlotResponseDto } from '../dto/close-dashboard-slot-response.dto';
import { OpenDashboardDayResponseDto } from '../dto/open-dashboard-day-response.dto';
import { OpenDashboardSlotDto } from '../dto/open-dashboard-slot.dto';
import { OpenDashboardSlotResponseDto } from '../dto/open-dashboard-slot-response.dto';

const formatIsoDateToSheetDate = (date: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

@Controller('reservations')
@ApiTags('Reservations')
@UseGuards(InternalApiTokenGuard)
@ApiSecurity('internal-api-token')
@ApiHeader({
  name: INTERNAL_API_TOKEN_HEADER,
  description: 'Token interno requerido para consumir endpoints del dashboard.',
  required: true,
})
export class ReservationsController {
  constructor(private readonly reservationsDashboardService: ReservationsDashboardService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una reserva desde el dashboard',
    description:
      'Permite crear una reserva enviando fecha en formato ISO, horario, nombre, telefono y cantidad.',
  })
  @ApiBody({
    type: CreateDashboardReservationDto,
  })
  @ApiOkResponse({
    description: 'Reserva creada correctamente.',
    type: CreateDashboardReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El body es invalido.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'El alta no pudo realizarse por una regla de negocio.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  createReservation(
    @Body() body: CreateDashboardReservationDto,
  ): Promise<CreateDashboardReservationResponseDto> {
    return this.reservationsDashboardService.createReservation(body);
  }

  @Get('available-dates')
  @ApiOperation({
    summary: 'Obtener fechas disponibles del calendario de reservas',
    description:
      'Devuelve las fechas cargadas en agenda para poblar el calendario del dashboard, en formato ISO.',
  })
  @ApiOkResponse({
    description: 'Listado de fechas cargadas en agenda.',
    type: AvailableReservationDatesResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  async getAvailableDates(): Promise<AvailableReservationDatesResponseDto> {
    const dates = await this.reservationsDashboardService.getAvailableDates();

    return { dates };
  }

  @Get('slots')
  @ApiOperation({
    summary: 'Obtener horarios disponibles de una fecha',
    description: 'Devuelve las franjas horarias disponibles en agenda para la fecha solicitada.',
  })
  @ApiOkResponse({
    description: 'Listado de horarios disponibles para la fecha solicitada.',
    type: DailyReservationSlotsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La query date no tiene un formato valido.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  getDailySlots(
    @Query() query: GetDailyReservationsSummaryQueryDto,
  ): Promise<DailyReservationSlotsResponseDto> {
    return this.reservationsDashboardService.getDailySlots(
      query.date,
      formatIsoDateToSheetDate(query.date),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener resumen diario de reservas',
    description:
      'Devuelve cantidad de reservas, capacidad total, total de personas reservadas, reservas del dia y disponibilidad por franja.',
  })
  @ApiOkResponse({
    description: 'Resumen diario de reservas para la fecha solicitada.',
    type: DailyReservationsSummaryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La query date no tiene un formato valido.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  getDailySummary(
    @Query() query: GetDailyReservationsSummaryQueryDto,
  ): Promise<DailyReservationsSummaryResponseDto> {
    return this.reservationsDashboardService.getDailySummary(
      query.date,
      formatIsoDateToSheetDate(query.date),
    );
  }

  @Patch()
  @ApiOperation({
    summary: 'Editar una reserva existente desde el dashboard',
    description:
      'Permite editar fecha, hora, nombre y cantidad enviando en el body el telefono, la fecha actual y la hora actual para localizar la reserva.',
  })
  @ApiBody({
    type: UpdateDashboardReservationDto,
  })
  @ApiOkResponse({
    description: 'Reserva actualizada correctamente.',
    type: UpdateDashboardReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El body es invalido o no incluye campos editables.',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No se encontro la reserva original con los datos enviados.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La actualizacion no pudo realizarse por una regla de negocio.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  updateReservation(
    @Body() body: UpdateDashboardReservationDto,
  ): Promise<UpdateDashboardReservationResponseDto> {
    return this.reservationsDashboardService.updateReservation(body);
  }

  @Delete()
  @ApiOperation({
    summary: 'Eliminar una reserva existente desde el dashboard',
    description:
      'Permite eliminar una reserva enviando en el body el telefono, la fecha actual y la hora actual para localizarla.',
  })
  @ApiBody({
    type: DeleteDashboardReservationDto,
  })
  @ApiOkResponse({
    description: 'Reserva eliminada correctamente.',
    type: DeleteDashboardReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El body es invalido.',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No se encontro la reserva original con los datos enviados.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La eliminacion no pudo realizarse por una regla de negocio.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  deleteReservation(
    @Body() body: DeleteDashboardReservationDto,
  ): Promise<DeleteDashboardReservationResponseDto> {
    return this.reservationsDashboardService.deleteReservation(body);
  }

  @Put('closed-days/:date')
  @ApiOperation({
    summary: 'Cerrar un dia de agenda desde el dashboard',
    description:
      'Marca una fecha como cerrada para bloquear nuevas reservas y reprogramaciones hacia ese dia.',
  })
  @ApiParam({
    name: 'date',
    description: 'Fecha a cerrar en formato ISO yyyy-mm-dd.',
    example: '2026-04-16',
  })
  @ApiBody({
    type: CloseDashboardDayDto,
    required: false,
  })
  @ApiOkResponse({
    description: 'Dia cerrado correctamente.',
    type: CloseDashboardDayResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La fecha del path o el body son invalidos.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La fecha no existe en la agenda.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  closeDay(
    @Param() params: ReservationClosedDayParamDto,
    @Body() body: CloseDashboardDayDto = {},
  ): Promise<CloseDashboardDayResponseDto> {
    return this.reservationsDashboardService.closeDay({
      date: params.date,
      reason: body.reason,
    });
  }

  @Put('closed-slots/:date')
  @ApiOperation({
    summary: 'Cerrar una franja horaria de agenda desde el dashboard',
    description:
      'Marca una franja horaria de una fecha como cerrada para bloquear nuevas reservas y reprogramaciones hacia ese rango.',
  })
  @ApiParam({
    name: 'date',
    description: 'Fecha a cerrar parcialmente en formato ISO yyyy-mm-dd.',
    example: '2026-04-16',
  })
  @ApiBody({
    type: CloseDashboardSlotDto,
  })
  @ApiOkResponse({
    description: 'Franja horaria cerrada correctamente.',
    type: CloseDashboardSlotResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La fecha del path o el body son invalidos.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La fecha no existe en la agenda.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  closeSlot(
    @Param() params: ReservationClosedDayParamDto,
    @Body() body: CloseDashboardSlotDto,
  ): Promise<CloseDashboardSlotResponseDto> {
    return this.reservationsDashboardService.closeSlot({
      date: params.date,
      fromTime: body.fromTime,
      toTime: body.toTime,
      reason: body.reason,
    });
  }

  @Delete('closed-days/:date')
  @ApiOperation({
    summary: 'Reabrir un dia de agenda desde el dashboard',
    description: 'Quita el estado cerrado de una fecha para permitir nuevas reservas nuevamente.',
  })
  @ApiParam({
    name: 'date',
    description: 'Fecha a reabrir en formato ISO yyyy-mm-dd.',
    example: '2026-04-16',
  })
  @ApiOkResponse({
    description: 'Dia reabierto correctamente.',
    type: OpenDashboardDayResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La fecha del path es invalida.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  openDay(@Param() params: ReservationClosedDayParamDto): Promise<OpenDashboardDayResponseDto> {
    return this.reservationsDashboardService.openDay(params.date);
  }

  @Delete('closed-slots/:date')
  @ApiOperation({
    summary: 'Reabrir una franja horaria de agenda desde el dashboard',
    description:
      'Quita total o parcialmente un cierre de franja horaria para una fecha que no este cerrada por dia completo.',
  })
  @ApiParam({
    name: 'date',
    description: 'Fecha a reabrir parcialmente en formato ISO yyyy-mm-dd.',
    example: '2026-04-16',
  })
  @ApiBody({
    type: OpenDashboardSlotDto,
  })
  @ApiOkResponse({
    description: 'Franja horaria reabierta correctamente.',
    type: OpenDashboardSlotResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La fecha del path o el body son invalidos.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La fecha no existe en la agenda o esta cerrada por dia completo.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'El request no incluyo un token interno valido.',
  })
  openSlot(
    @Param() params: ReservationClosedDayParamDto,
    @Body() body: OpenDashboardSlotDto,
  ): Promise<OpenDashboardSlotResponseDto> {
    return this.reservationsDashboardService.openSlot({
      date: params.date,
      fromTime: body.fromTime,
      toTime: body.toTime,
    });
  }
}
