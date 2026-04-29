import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DashboardOpenSlotResult, DashboardOpenSlotType } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class OpenDashboardSlotUseCase {
  private readonly logger = new Logger(OpenDashboardSlotUseCase.name);

  constructor(
    private readonly datesService: DatesService,
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
  ) {}

  async execute(payload: DashboardOpenSlotType): Promise<DashboardOpenSlotResult> {
    const normalizedPayload = this.normalizePayload(payload);
    this.validateRange(normalizedPayload.fromTime, normalizedPayload.toTime);

    const agendaDateLabel = await this.datesService.resolveAgendaDateLabel(normalizedPayload.date);

    if (!agendaDateLabel) {
      this.logger.warn(
        `No se pudo reabrir una franja fuera de agenda. date=${normalizedPayload.date}`,
      );

      throw new ConflictException({
        statusCode: 409,
        message: 'La fecha seleccionada no existe en la agenda.',
        error: 'Conflict',
      });
    }

    const isDayClosed = await this.reservationsDashboardReadPort.isDayClosed(
      normalizedPayload.date,
    );

    if (isDayClosed) {
      throw new ConflictException({
        statusCode: 409,
        message:
          'La fecha seleccionada esta cerrada por dia completo. Reabri el dia antes de reabrir franjas horarias.',
        error: 'Conflict',
      });
    }

    const reopenedSlotsCount = await this.reservationsDashboardReadPort.openSlot(normalizedPayload);

    return {
      date: normalizedPayload.date,
      fromTime: normalizedPayload.fromTime,
      toTime: normalizedPayload.toTime,
      isClosed: false,
      reopenedSlotsCount,
    };
  }

  private normalizePayload(payload: DashboardOpenSlotType): DashboardOpenSlotType {
    return {
      date: payload.date.trim(),
      fromTime: payload.fromTime.trim(),
      toTime: payload.toTime.trim(),
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
