import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DashboardReservation,
  DashboardUpdateReservationResult,
  DashboardUpdateReservationType,
  formatPhoneNumber,
  StatusEnum,
  UpdateReservationType,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { UpdateReservationQueueService } from 'src/modules/reservation-jobs/service/update-reservation-queue.service';

@Injectable()
export class UpdateDashboardReservationUseCase {
  private readonly logger = new Logger(UpdateDashboardReservationUseCase.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly updateReservationQueueService: UpdateReservationQueueService,
  ) {}

  async execute(
    payload: DashboardUpdateReservationType,
  ): Promise<DashboardUpdateReservationResult> {
    const normalizedPayload = this.normalizePayload(payload);

    this.ensureEditableFieldsArePresent(normalizedPayload);

    this.logger.log(
      `Intentando actualizar reserva del dashboard. phone=${normalizedPayload.phone} currentDate=${normalizedPayload.currentDate} currentTime=${normalizedPayload.currentTime}`,
    );

    const currentReservation = await this.datesService.findReservationByLookup(
      normalizedPayload.currentDate,
      normalizedPayload.currentTime,
      normalizedPayload.phone,
    );

    if (!currentReservation) {
      this.logger.warn(
        `No se encontro la reserva original. phone=${normalizedPayload.phone} currentDate=${normalizedPayload.currentDate} currentTime=${normalizedPayload.currentTime}`,
      );

      throw new NotFoundException({
        statusCode: 404,
        message: 'No encontramos una reserva con los datos enviados.',
        error: 'Not Found',
      });
    }

    const targetDate = normalizedPayload.date
      ? await this.resolveTargetDate(normalizedPayload.date)
      : currentReservation.date;

    const updateReservationPayload: UpdateReservationType = {
      currentName: currentReservation.name,
      phone: normalizedPayload.phone,
      currentDate: currentReservation.date,
      currentTime: currentReservation.time,
      currentQuantity: String(currentReservation.quantity),
      newDate: targetDate !== currentReservation.date ? targetDate : null,
      newTime:
        normalizedPayload.time && normalizedPayload.time !== currentReservation.time
          ? normalizedPayload.time
          : null,
      newName:
        normalizedPayload.name && normalizedPayload.name !== currentReservation.name
          ? normalizedPayload.name
          : null,
      newQuantity:
        normalizedPayload.quantity !== undefined &&
        normalizedPayload.quantity !== currentReservation.quantity
          ? String(normalizedPayload.quantity)
          : null,
      stage: 'reschedule',
    };

    const result =
      await this.updateReservationQueueService.updateReservation(updateReservationPayload);

    if (result.error) {
      this.logger.warn(
        `No se pudo actualizar la reserva del dashboard. status=${result.status} phone=${normalizedPayload.phone}`,
      );

      throw this.mapBusinessErrorToHttpException(result.status, result.message);
    }

    const updatedReservation: DashboardReservation = {
      ...currentReservation,
      date: targetDate,
      time: normalizedPayload.time ?? currentReservation.time,
      name: normalizedPayload.name ?? currentReservation.name,
      phone: normalizedPayload.phone,
      quantity: normalizedPayload.quantity ?? currentReservation.quantity,
    };

    this.logger.log(
      `Reserva actualizada correctamente desde dashboard. phone=${normalizedPayload.phone} targetDate=${updatedReservation.date} targetTime=${updatedReservation.time}`,
    );

    return {
      message: result.message,
      reservation: updatedReservation,
    };
  }

  private normalizePayload(
    payload: DashboardUpdateReservationType,
  ): DashboardUpdateReservationType {
    return {
      ...payload,
      phone: formatPhoneNumber(payload.phone) ?? payload.phone.trim(),
      currentDate: payload.currentDate.trim(),
      currentTime: payload.currentTime.trim(),
      date: payload.date?.trim(),
      time: payload.time?.trim(),
      name: payload.name?.trim(),
    };
  }

  private ensureEditableFieldsArePresent(payload: DashboardUpdateReservationType): void {
    if (
      payload.date === undefined &&
      payload.time === undefined &&
      payload.name === undefined &&
      payload.quantity === undefined
    ) {
      this.logger.warn(
        `Se rechazo una actualizacion sin campos editables. phone=${payload.phone} currentDate=${payload.currentDate} currentTime=${payload.currentTime}`,
      );

      throw new BadRequestException({
        statusCode: 400,
        message: 'Debes enviar al menos un campo editable para actualizar la reserva.',
        error: 'Bad Request',
      });
    }
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
    if (status === StatusEnum.MISSING_DATA_UPDATE) {
      return new BadRequestException({
        statusCode: 400,
        message,
        error: 'Bad Request',
      });
    }

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
