import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DashboardCloseSlotResult, DashboardCloseSlotType } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class CloseDashboardSlotUseCase {
  private readonly logger = new Logger(CloseDashboardSlotUseCase.name);

  constructor(
    private readonly datesService: DatesService,
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
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
    const affectedReservationsCount = existingReservations.filter((reservation) =>
      this.hasReservationOverlap(
        reservation.time,
        normalizedPayload.fromTime,
        normalizedPayload.toTime,
      ),
    ).length;

    const consolidatedSlot = await this.reservationsDashboardReadPort.closeSlot(normalizedPayload);

    const warning =
      affectedReservationsCount > 0
        ? `La franja fue cerrada, pero todavia existen ${affectedReservationsCount} reservas activas afectadas que deberan ser gestionadas manualmente.`
        : null;

    return {
      date: normalizedPayload.date,
      fromTime: consolidatedSlot.fromTime,
      toTime: consolidatedSlot.toTime,
      isClosed: true,
      reason: consolidatedSlot.reason,
      existingReservationsCount: affectedReservationsCount,
      warning,
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
}
