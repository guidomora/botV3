import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DashboardDeleteReservationResult,
  DashboardDeleteReservationType,
  formatPhoneNumber,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';

@Injectable()
export class DeleteDashboardReservationUseCase {
  private readonly logger = new Logger(DeleteDashboardReservationUseCase.name);

  constructor(private readonly datesService: DatesService) {}

  async execute(
    payload: DashboardDeleteReservationType,
  ): Promise<DashboardDeleteReservationResult> {
    const normalizedPayload = this.normalizePayload(payload);

    this.logger.log(
      `Intentando eliminar reserva del dashboard. phone=${normalizedPayload.phone} currentDate=${normalizedPayload.currentDate} currentTime=${normalizedPayload.currentTime}`,
    );

    const currentReservation = await this.datesService.findReservationByLookup(
      normalizedPayload.currentDate,
      normalizedPayload.currentTime,
      normalizedPayload.phone,
    );

    if (!currentReservation) {
      this.logger.warn(
        `No se encontro la reserva a eliminar. phone=${normalizedPayload.phone} currentDate=${normalizedPayload.currentDate} currentTime=${normalizedPayload.currentTime}`,
      );

      throw new NotFoundException({
        statusCode: 404,
        message: 'No encontramos una reserva con los datos enviados.',
        error: 'Not Found',
      });
    }

    const result = await this.datesService.deleteReservation({
      phone: normalizedPayload.phone,
      date: currentReservation.date,
      time: currentReservation.time,
      name: currentReservation.name,
    });

    if (result !== 'Su reserva ha sido cancelada correctamente.') {
      this.logger.warn(
        `No se pudo eliminar la reserva del dashboard. phone=${normalizedPayload.phone} currentDate=${normalizedPayload.currentDate} currentTime=${normalizedPayload.currentTime} result=${result}`,
      );

      throw new ConflictException({
        statusCode: 409,
        message: result,
        error: 'Conflict',
      });
    }

    this.logger.log(
      `Reserva eliminada correctamente desde dashboard. phone=${normalizedPayload.phone} currentDate=${normalizedPayload.currentDate} currentTime=${normalizedPayload.currentTime}`,
    );

    return {
      message: 'Reserva eliminada correctamente.',
      reservation: currentReservation,
    };
  }

  private normalizePayload(
    payload: DashboardDeleteReservationType,
  ): DashboardDeleteReservationType {
    return {
      phone: formatPhoneNumber(payload.phone) ?? payload.phone.trim(),
      currentDate: payload.currentDate.trim(),
      currentTime: payload.currentTime.trim(),
    };
  }
}
