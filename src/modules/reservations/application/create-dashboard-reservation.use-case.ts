import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ServiceName } from 'src/constants';
import {
  DashboardCreateReservationResult,
  DashboardCreateReservationType,
  StatusEnum,
  formatPhoneNumber,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';

@Injectable()
export class CreateDashboardReservationUseCase {
  private readonly logger = new Logger(CreateDashboardReservationUseCase.name);

  constructor(private readonly datesService: DatesService) {}

  async execute(
    payload: DashboardCreateReservationType,
  ): Promise<DashboardCreateReservationResult> {
    const normalizedPayload = this.normalizePayload(payload);
    const targetDate = await this.resolveTargetDate(normalizedPayload.date);

    this.logger.log(
      `Intentando crear reserva desde dashboard. phone=${normalizedPayload.phone} date=${targetDate} time=${normalizedPayload.time}`,
    );

    const result = await this.datesService.createReservation(
      {
        date: targetDate,
        time: normalizedPayload.time,
        name: normalizedPayload.name,
        phone: normalizedPayload.phone,
        quantity: normalizedPayload.quantity,
      },
      {
        allowLargeReservations: true,
      },
    );

    if (result.error) {
      this.logger.warn(
        `No se pudo crear la reserva desde dashboard. status=${result.status} phone=${normalizedPayload.phone} date=${targetDate} time=${normalizedPayload.time}`,
      );

      throw this.mapBusinessErrorToHttpException(result.status, result.message);
    }

    this.logger.log(
      `Reserva creada correctamente desde dashboard. phone=${normalizedPayload.phone} date=${targetDate} time=${normalizedPayload.time}`,
    );

    return {
      message: result.message,
      reservation: {
        date: targetDate,
        time: normalizedPayload.time,
        name: normalizedPayload.name,
        phone: normalizedPayload.phone,
        service: ServiceName.DINNER,
        quantity: normalizedPayload.quantity,
      },
    };
  }

  private normalizePayload(
    payload: DashboardCreateReservationType,
  ): DashboardCreateReservationType {
    return {
      ...payload,
      date: payload.date.trim(),
      time: payload.time.trim(),
      name: payload.name.trim(),
      phone: formatPhoneNumber(payload.phone) ?? payload.phone.trim(),
    };
  }

  private async resolveTargetDate(date: string): Promise<string> {
    const resolvedDate = await this.datesService.resolveAgendaDateLabel(date);

    if (!resolvedDate) {
      this.logger.warn(`La fecha solicitada no existe en la agenda. date=${date}`);

      throw new ConflictException({
        statusCode: 409,
        message: 'La fecha seleccionada no esta disponible en la agenda.',
        error: 'Conflict',
      });
    }

    return resolvedDate;
  }

  private mapBusinessErrorToHttpException(status: StatusEnum, message: string): Error {
    if (status === StatusEnum.NO_DATE_FOUND) {
      return new ConflictException({
        statusCode: 409,
        message: 'La fecha u horario seleccionado no existe en la agenda.',
        error: 'Conflict',
      });
    }

    return new ConflictException({
      statusCode: 409,
      message,
      error: 'Conflict',
    });
  }
}
