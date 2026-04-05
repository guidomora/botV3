import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import {
  AddMissingFieldInput,
  AddMissingFieldOutput,
  AvailabilityResponse,
  DeleteReservation,
  formatPhoneNumber,
  GetIndexParams,
  ServiceResponse,
  StatusEnum,
  TemporalStatusEnum,
  UpdateReservationType,
} from 'src/lib';
import {
  CreateDayUseCase,
  CreateReservationRowUseCase,
  DeleteReservationUseCase,
  EnsureAgendaWindowUseCase,
  UpdateReservationUseCase,
} from '../application';
import { GoogleTemporalSheetsService } from 'src/modules/google-sheets/service/google-temporal-sheet.service';
import { pickAvailabilityForTime, formatAvailabilityResponse } from '../utils';
import { TemporalDataRows } from 'src/constants/tables-info/temporal-data-rows';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);

  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
    private readonly createReservationRowUseCase: CreateReservationRowUseCase,
    private readonly deleteReservationUseCase: DeleteReservationUseCase,
    private readonly ensureAgendaWindowUseCase: EnsureAgendaWindowUseCase,
    private readonly updateReservationUseCase: UpdateReservationUseCase,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetsTemporalService: GoogleTemporalSheetsService,
  ) {}

  async createDate(): Promise<string> {
    return this.createDayUseCase.createDate();
  }

  async createNextDate(): Promise<string> {
    return this.createDayUseCase.createNextDate();
  }

  async createXDates(quantity: number): Promise<string> {
    return this.createDayUseCase.createXDates(quantity);
  }

  async ensureAgendaWindow() {
    return this.ensureAgendaWindowUseCase.ensureAgendaWindow();
  }

  async createReservationWithMultipleMessages(
    createReservationDto: AddMissingFieldInput,
  ): Promise<AddMissingFieldOutput> {
    const reservation =
      await this.googleSheetsTemporalService.addMissingField(createReservationDto);

    const progressiveValidationResult =
      await this.validateProgressiveReservationAvailability(reservation);

    if (progressiveValidationResult) {
      return progressiveValidationResult;
    }

    const { date, time, name, phone, quantity } = reservation.snapshot;
    const formattedPhone = formatPhoneNumber(phone);
    if (reservation.status === TemporalStatusEnum.COMPLETED) {
      const customerData = {
        date: date!.toLowerCase(),
        time: time!.toLowerCase(),
        name: name!.toLowerCase(),
        phone: formattedPhone?.toLowerCase() ?? phone!.toLowerCase(),
        quantity: Number(quantity!),
      };

      const createResponse = await this.createReservationRowUseCase.createReservation(customerData);
      if (createResponse.error) {
        if (createResponse.status === StatusEnum.DATE_ALREADY_PASSED) {
          return {
            status: TemporalStatusEnum.IN_PROGRESS,
            missingFields: ['date', 'time'],
            reservationData: reservation.snapshot,
            message: createResponse.message,
            errorStatus: createResponse.status,
          };
        }
        return {
          status: TemporalStatusEnum.FAILED,
          missingFields: reservation.missingFields,
          reservationData: reservation.snapshot,
          message: createResponse.message,
          errorStatus: createResponse.status,
        };
      }
      this.logger.log('Reserva trasladada a hoja de reservas');

      await this.googleSheetsService.deleteRow(reservation.rowIndex, 2);

      this.logger.log('Fila eliminada de la hoja temporal');
    }
    return {
      status: reservation.status,
      missingFields: reservation.missingFields,
      reservationData: reservation.snapshot,
    };
  }

  private async validateProgressiveReservationAvailability(
    reservation: TemporalDataRows,
  ): Promise<AddMissingFieldOutput | null> {
    const { snapshot, previousSnapshot } = reservation;
    const date = this.normalizeTemporalValue(snapshot.date);
    const time = this.normalizeTemporalValue(snapshot.time);
    const quantity = this.parseTemporalQuantity(snapshot.quantity);
    const waId = snapshot.waId;
    const dateWasCompletedNow = this.didTemporalFieldBecomeCompleted(
      previousSnapshot?.date,
      snapshot.date,
    );
    const timeWasCompletedNow = this.didTemporalFieldBecomeCompleted(
      previousSnapshot?.time,
      snapshot.time,
    );
    const quantityWasCompletedNow = this.didTemporalFieldBecomeCompleted(
      previousSnapshot?.quantity,
      snapshot.quantity,
    );

    if (!waId) {
      return null;
    }

    if (dateWasCompletedNow && date) {
      const availabilitySheetIndex = 1;
      const dateIndex = await this.googleSheetsService.getDateIndexByDate(
        date,
        availabilitySheetIndex,
      );

      if (dateIndex === -1) {
        const cleanedReservation = await this.googleSheetsTemporalService.clearFields(waId, [
          'date',
          'time',
        ]);

        return {
          status: TemporalStatusEnum.IN_PROGRESS,
          missingFields: cleanedReservation.missingFields,
          reservationData: cleanedReservation.snapshot,
          message: 'Esa fecha todavia no esta disponible en la agenda. Por favor elegi otra fecha.',
          errorStatus: StatusEnum.NO_DATE_FOUND,
        };
      }

      const dayAvailability = await this.getDayAvailability(date);

      if (dayAvailability.slots.length === 0) {
        const cleanedReservation = await this.googleSheetsTemporalService.clearFields(waId, [
          'date',
          'time',
        ]);

        return {
          status: TemporalStatusEnum.IN_PROGRESS,
          missingFields: cleanedReservation.missingFields,
          reservationData: cleanedReservation.snapshot,
          message: 'No hay disponibilidad para esa fecha. Por favor elegi otra fecha.',
          errorStatus: StatusEnum.NO_AVAILABILITY,
        };
      }
    }

    if (timeWasCompletedNow && date && time) {
      const requestedTimeAvailability = await this.getDayAndTimeAvailability(date, time);
      const exactSlotAvailable = requestedTimeAvailability.slots.some((slot) => slot.time === time);

      if (!exactSlotAvailable) {
        await this.googleSheetsTemporalService.clearFields(waId, ['time']);

        return {
          status: TemporalStatusEnum.FAILED,
          missingFields: reservation.missingFields,
          reservationData: snapshot,
          message: 'Ese horario no esta disponible. Te comparto horarios cercanos.',
          errorStatus: StatusEnum.NO_AVAILABILITY,
        };
      }
    }

    if ((timeWasCompletedNow || quantityWasCompletedNow) && date && time && quantity) {
      const availability = await this.googleSheetsService.getAvailabilityFromReservations(
        date,
        time,
        quantity,
      );

      if (!availability.isAvailable) {
        await this.googleSheetsTemporalService.clearFields(waId, ['time']);

        return {
          status: TemporalStatusEnum.FAILED,
          missingFields: reservation.missingFields,
          reservationData: snapshot,
          message:
            'No hay lugar para esa cantidad de personas en ese horario. Proba con una hora cercana y te ayudo a encontrar lugar.',
          errorStatus: StatusEnum.NO_AVAILABILITY,
        };
      }
    }

    return null;
  }

  private normalizeTemporalValue(value?: string): string | null {
    const normalized = value?.trim();
    return normalized && normalized !== ' ' ? normalized : null;
  }

  private didTemporalFieldBecomeCompleted(previousValue?: string, nextValue?: string): boolean {
    const normalizedPreviousValue = this.normalizeTemporalValue(previousValue);
    const normalizedNextValue = this.normalizeTemporalValue(nextValue);

    return !normalizedPreviousValue && !!normalizedNextValue;
  }

  private parseTemporalQuantity(quantity?: string): number | null {
    const normalizedQuantity = this.normalizeTemporalValue(quantity);

    if (!normalizedQuantity) {
      return null;
    }

    const parsedQuantity = Number(normalizedQuantity);
    return Number.isNaN(parsedQuantity) ? null : parsedQuantity;
  }

  async deleteIncompleteTemporalReservationByWaId(waId: string): Promise<boolean> {
    const rowIndex = await this.googleSheetsTemporalService.findTemporalRowIndexByWaId(waId);

    if (rowIndex === -1) {
      this.logger.log(`No se encontró fila temporal para limpiar en waId ${waId}`);
      return false;
    }

    await this.googleSheetsService.deleteRow(rowIndex, 2);
    this.logger.log(`Fila temporal incompleta eliminada para waId ${waId}`);

    return true;
  }

  async deleteReservation(deleteReservation: DeleteReservation): Promise<string> {
    return this.deleteReservationUseCase.deleteReservation(deleteReservation);
  }

  async deleteOldRows() {
    return this.deleteReservationUseCase.deleteOldRows();
  }

  async getDayAvailability(date: string): Promise<AvailabilityResponse> {
    const dates = await this.googleSheetsService.getDayAvailability(date);
    this.logger.log('Day availability checked');
    return formatAvailabilityResponse(dates);
  }

  async getDayAndTimeAvailability(date: string, time: string): Promise<AvailabilityResponse> {
    const dates = await this.googleSheetsService.getDayAvailability(date);

    const formatedDayAvailability = formatAvailabilityResponse(dates);

    this.logger.log('Day and time availability checked');

    const slotIntervalMinutes = Number(process.env.SLOT_INTERVAL_MINUTES ?? 60);

    return pickAvailabilityForTime(formatedDayAvailability, time, {
      neighborCount: 2,
      slotIntervalMinutes: Number.isNaN(slotIntervalMinutes) ? 60 : slotIntervalMinutes,
    });
  }

  async getReservationIndexByData(
    currentDate: string,
    currentTime: string,
    currentName: string,
    phone: string,
  ): Promise<number> {
    const searchIndexObject: GetIndexParams = {
      date: currentDate,
      time: currentTime,
      name: currentName.toLowerCase(),
      phone,
    };

    return this.googleSheetsService.getDateIndexByData(searchIndexObject);
  }

  async updateReservation(updateReservation: UpdateReservationType): Promise<ServiceResponse> {
    this.logger.log('Updating reservation', DatesService.name);
    return this.updateReservationUseCase.updateReservation(updateReservation);
  }
}
