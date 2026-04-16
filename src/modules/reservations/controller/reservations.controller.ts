import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
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
}
