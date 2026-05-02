import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DashboardCloseDayResult, DashboardCloseDayType, DashboardReservation } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ClosureNotificationQueueService } from 'src/modules/reservation-jobs/service/closure-notification-queue.service';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class CloseDashboardDayUseCase {
  private readonly logger = new Logger(CloseDashboardDayUseCase.name);

  constructor(
    private readonly datesService: DatesService,
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
    private readonly closureNotificationQueueService: ClosureNotificationQueueService,
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
    const notificationResult = await this.enqueueClosureNotifications({
      date: normalizedDate,
      sheetDate: agendaDateLabel,
      reason: normalizedReason,
      reservations: existingReservations,
    });

    return {
      date: normalizedDate,
      isClosed: true,
      reason: normalizedReason,
      existingReservationsCount,
      notificationsQueuedCount: notificationResult.queuedCount,
      warning: notificationResult.warning,
    };
  }

  private async enqueueClosureNotifications(params: {
    date: string;
    sheetDate: string;
    reason: string | null;
    reservations: DashboardReservation[];
  }): Promise<{ queuedCount: number; warning: string | null }> {
    if (params.reservations.length === 0) {
      return { queuedCount: 0, warning: null };
    }

    try {
      const result = await this.closureNotificationQueueService.notifyClosure({
        closureType: 'day',
        date: params.date,
        sheetDate: params.sheetDate,
        reason: params.reason,
        reservations: params.reservations,
      });

      return { queuedCount: result.queuedCount, warning: null };
    } catch (error) {
      this.logger.error(
        `No se pudieron encolar notificaciones de cierre de dia date=${params.date}`,
        error instanceof Error ? error.stack : String(error),
      );

      return {
        queuedCount: 0,
        warning:
          'La fecha fue cerrada, pero no se pudieron encolar las notificaciones a las reservas afectadas.',
      };
    }
  }
}
