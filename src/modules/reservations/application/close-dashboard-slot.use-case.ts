import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DashboardCloseSlotResult, DashboardCloseSlotType, DashboardReservation } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ClosureNotificationQueueService } from 'src/modules/reservation-jobs/service/closure-notification-queue.service';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class CloseDashboardSlotUseCase {
  private readonly logger = new Logger(CloseDashboardSlotUseCase.name);

  constructor(
    private readonly datesService: DatesService,
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
    private readonly closureNotificationQueueService: ClosureNotificationQueueService,
  ) {}

  async execute(payload: DashboardCloseSlotType): Promise<DashboardCloseSlotResult> {
    const normalizedPayload = this.normalizePayload(payload);
    this.validateRange(normalizedPayload.fromTime, normalizedPayload.toTime);

    const agendaDateLabel = await this.datesService.resolveAgendaDateLabel(normalizedPayload.date);

    if (!agendaDateLabel) {
      this.logger.warn(
        `No se pudo cerrar una franja fuera de agenda. date=${normalizedPayload.date}`,
      );

      throw new ConflictException({
        statusCode: 409,
        message: 'La fecha seleccionada no existe en la agenda.',
        error: 'Conflict',
      });
    }

    const existingReservations =
      await this.reservationsDashboardReadPort.getReservationsByDate(agendaDateLabel);
    const affectedReservations = existingReservations.filter((reservation) =>
      this.hasReservationOverlap(
        reservation.time,
        normalizedPayload.fromTime,
        normalizedPayload.toTime,
      ),
    );

    const consolidatedSlot = await this.reservationsDashboardReadPort.closeSlot(normalizedPayload);
    const notificationResult = await this.enqueueClosureNotifications({
      date: normalizedPayload.date,
      sheetDate: agendaDateLabel,
      fromTime: consolidatedSlot.fromTime,
      toTime: consolidatedSlot.toTime,
      reason: consolidatedSlot.reason,
      reservations: affectedReservations,
    });

    return {
      date: normalizedPayload.date,
      fromTime: consolidatedSlot.fromTime,
      toTime: consolidatedSlot.toTime,
      isClosed: true,
      reason: consolidatedSlot.reason,
      existingReservationsCount: affectedReservations.length,
      notificationsQueuedCount: notificationResult.queuedCount,
      closureOperationId: notificationResult.closureOperationId,
      warning: notificationResult.warning,
    };
  }

  private normalizePayload(payload: DashboardCloseSlotType): DashboardCloseSlotType {
    return {
      date: payload.date.trim(),
      fromTime: payload.fromTime.trim(),
      toTime: payload.toTime.trim(),
      reason: payload.reason?.trim() || undefined,
    };
  }

  private validateRange(fromTime: string, toTime: string): void {
    const fromMinutes = this.toMinutes(fromTime);
    const toMinutes = this.toMinutes(toTime);

    if (fromMinutes === null || toMinutes === null || fromMinutes >= toMinutes) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'La franja horaria debe tener un rango valido con fromTime menor a toTime.',
        error: 'Bad Request',
      });
    }
  }

  private hasReservationOverlap(
    reservationTime: string,
    fromTime: string,
    toTime: string,
  ): boolean {
    const reservationStart = this.toMinutes(reservationTime);
    const closedStart = this.toMinutes(fromTime);
    const closedEnd = this.toMinutes(toTime);

    if (reservationStart === null || closedStart === null || closedEnd === null) {
      return false;
    }

    const reservationDurationMinutes = Number(process.env.RESERVATION_DURATION_MINUTES ?? 120);
    const safeDuration =
      Number.isNaN(reservationDurationMinutes) || reservationDurationMinutes <= 0
        ? 120
        : reservationDurationMinutes;

    const reservationEnd = reservationStart + safeDuration;

    return reservationStart < closedEnd && closedStart < reservationEnd;
  }

  private toMinutes(time: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(time);

    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private async enqueueClosureNotifications(params: {
    date: string;
    sheetDate: string;
    fromTime: string;
    toTime: string;
    reason: string | null;
    reservations: DashboardReservation[];
  }): Promise<{ queuedCount: number; closureOperationId: string | null; warning: string | null }> {
    if (params.reservations.length === 0) {
      return { queuedCount: 0, closureOperationId: null, warning: null };
    }

    try {
      const result = await this.closureNotificationQueueService.notifyClosure({
        closureType: 'slot',
        date: params.date,
        sheetDate: params.sheetDate,
        fromTime: params.fromTime,
        toTime: params.toTime,
        reason: params.reason,
        reservations: params.reservations,
      });

      return {
        queuedCount: result.queuedCount,
        closureOperationId: result.closureOperationId,
        warning: null,
      };
    } catch (error) {
      this.logger.error(
        `No se pudieron encolar notificaciones de cierre de franja date=${params.date} from=${params.fromTime} to=${params.toTime}`,
        error instanceof Error ? error.stack : String(error),
      );

      return {
        queuedCount: 0,
        closureOperationId: null,
        warning:
          'La franja fue cerrada, pero no se pudieron encolar las notificaciones a las reservas afectadas.',
      };
    }
  }
}
