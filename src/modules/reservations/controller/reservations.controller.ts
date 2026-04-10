import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { INTERNAL_API_TOKEN_HEADER } from 'src/constants';
import { ValidationErrorResponseDto } from 'src/lib';
import { ReservationsDashboardService } from '../service/reservations-dashboard.service';
import { DailyReservationsSummaryResponseDto } from '../dto/daily-reservations-summary-response.dto';
import { GetDailyReservationsSummaryQueryDto } from '../dto/get-daily-reservations-summary-query.dto';
import { InternalApiTokenGuard } from '../guards/internal-api-token.guard';

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
}
