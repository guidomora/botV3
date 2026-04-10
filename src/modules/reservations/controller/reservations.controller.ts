import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidationErrorResponseDto } from 'src/lib';
import { ReservationsDashboardService } from '../service/reservations-dashboard.service';
import { DailyReservationsSummaryResponseDto } from '../dto/daily-reservations-summary-response.dto';
import { GetDailyReservationsSummaryQueryDto } from '../dto/get-daily-reservations-summary-query.dto';

const formatIsoDateToSheetDate = (date: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

@Controller('reservations')
@ApiTags('Reservations')
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
  getDailySummary(
    @Query() query: GetDailyReservationsSummaryQueryDto,
  ): Promise<DailyReservationsSummaryResponseDto> {
    return this.reservationsDashboardService.getDailySummary(
      query.date,
      formatIsoDateToSheetDate(query.date),
    );
  }
}
