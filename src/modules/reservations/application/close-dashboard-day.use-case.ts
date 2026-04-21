import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DashboardCloseDayResult, DashboardCloseDayType } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class CloseDashboardDayUseCase {
  private readonly logger = new Logger(CloseDashboardDayUseCase.name);

  constructor(
    private readonly datesService: DatesService,
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
  ) {}

  async execute(payload: DashboardCloseDayType): Promise<DashboardCloseDayResult> {
    const normalizedDate = payload.date.trim();
    const normalizedReason = payload.reason?.trim() || null;
    const agendaDateLabel = await this.datesService.resolveAgendaDateLabel(normalizedDate);

    if (!agendaDateLabel) {
      this.logger.warn(`No se pudo cerrar un dia fuera de agenda. date=${normalizedDate}`);

      throw new ConflictException({
        statusCode: 409,
        message: 'La fecha seleccionada no existe en la agenda.',
        error: 'Conflict',
      });
    }

    const existingReservations =
      await this.reservationsDashboardReadPort.getReservationsByDate(agendaDateLabel);

    await this.reservationsDashboardReadPort.closeDay({
      date: normalizedDate,
      reason: normalizedReason ?? undefined,
    });

    const existingReservationsCount = existingReservations.length;
    const warning =
      existingReservationsCount > 0
        ? `La fecha fue cerrada, pero todavia existen ${existingReservationsCount} reservas activas que deberan ser gestionadas manualmente.`
        : null;

    return {
      date: normalizedDate,
      isClosed: true,
      reason: normalizedReason,
      existingReservationsCount,
      warning,
    };
  }
}
