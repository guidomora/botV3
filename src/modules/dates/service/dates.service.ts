import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { CreateReservationType } from 'src/lib/types/reservation/create-reservation.type';
import { AddMissingFieldInput, AddMissingFieldOutput, AvailabilityResponse, DeleteReservation, TemporalStatusEnum, UpdateReservationType } from 'src/lib';
import { CreateDayUseCase, CreateReservationRowUseCase, DeleteReservationUseCase } from '../application';
import { GoogleTemporalSheetsService } from 'src/modules/google-sheets/service/google-temporal-sheet.service';
import { pickAvailabilityForTime, formatAvailabilityResponse } from '../utils';
import { SHEETS_NAMES } from 'src/constants';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);
  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
    private readonly createReservationRowUseCase: CreateReservationRowUseCase,
    private readonly deleteReservationUseCase: DeleteReservationUseCase,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleSheetsTemporalService: GoogleTemporalSheetsService,
  ) { }
  async createDate(): Promise<string> {
    return this.createDayUseCase.createDate()
  }

  async createNextDate(): Promise<string> {
    return this.createDayUseCase.createNextDate()
  }

  async createXDates(quantity: number): Promise<string> {
    return this.createDayUseCase.createXDates(quantity)
  }

  async createReservation(createReservation: CreateReservationType) {
    return this.createReservationRowUseCase.createReservation(createReservation)
  }

  async createReservationWithMultipleMessages(createReservationDto: AddMissingFieldInput): Promise<AddMissingFieldOutput> {
    const reservation = await this.googleSheetsTemporalService.addMissingField(createReservationDto);

    const { date, time, name, phone, quantity } = reservation.snapshot;
    if (reservation.status === TemporalStatusEnum.COMPLETED) {
      const customerData = { date: date!.toLowerCase(), time: time!.toLowerCase(), name: name!.toLowerCase(), phone: phone!.toLowerCase(), quantity: Number(quantity!) }

      await this.createReservationRowUseCase.createReservation(customerData);
      this.logger.log('Reserva trasladada a hoja de reservas');

      await this.googleSheetsService.deleteRow(reservation.rowIndex, 2)
      this.logger.log('Fila eliminada de la hoja temporal');
    }
    return {
      status: reservation.status,
      missingFields: reservation.missingFields,
      reservationData: reservation.snapshot
    }
  }

  async checkDate(date: string): Promise<boolean> {
    try {
      const dateExists = await this.googleSheetsService.checkDate(date)

      return dateExists;
    } catch (error) {
      this.logger.error(`Error al obtener el dia`, error);
      throw error;
    }
  }

  async deleteReservation(deleteReservation: DeleteReservation): Promise<string> {
    return this.deleteReservationUseCase.deleteReservation(deleteReservation)
  }

  async deleteOldRows() {
    return this.deleteReservationUseCase.deleteOldRows()
  }

  async getDayAvailability(date: string): Promise<AvailabilityResponse> {
    const dates = await this.googleSheetsService.getDayAvailability(date)
    this.logger.log('Day availability checked')
    return formatAvailabilityResponse(dates)
  }

  async getDayAndTimeAvailability(date: string, time: string): Promise<AvailabilityResponse> {
    const dates = await this.googleSheetsService.getDayAvailability(date)
    const formatedDayAvailability = formatAvailabilityResponse(dates)
    this.logger.log('Day and time availability checked')
    return pickAvailabilityForTime(formatedDayAvailability, time)
  }

  async updateReservation(updateReservation: UpdateReservationType): Promise<string> {
    const { currentDate, currentTime, newDate, newTime, name, phone } = updateReservation;

    if (!currentDate || !currentTime || !name || !phone) {
      throw new Error('Faltan datos de la reserva original');
    }

    const targetDate = newDate ?? currentDate;
    const targetTime = newTime ?? currentTime;

        const currentReservationIndex = await this.googleSheetsService.getDateIndexByData({
      date: currentDate,
      time: currentTime,
      name: name.toLowerCase(),
      phone
    });

    if (currentReservationIndex === -1) {
      return 'No se encontró la reserva con los datos proporcionados.';
    }

    const availability = await this.googleSheetsService.getAvailability(targetDate, targetTime);

    if (!availability.isAvailable) {
      return 'No hay disponibilidad para la nueva fecha y horario solicitados.';
    }

    const currentRow = await this.googleSheetsService.getRowValues(`${SHEETS_NAMES[0]}!A${currentReservationIndex}:F${currentReservationIndex}`);

    const parseValue = (value: unknown) => Array.isArray(value) ? value[0] : value;
    const quantity = Number(parseValue(currentRow?.[5])) || 1;

    const creationResult = await this.createReservationRowUseCase.createReservation({
      date: targetDate.toLowerCase(),
      time: targetTime,
      name: name.toLowerCase(),
      phone,
      quantity
    });

    if (typeof creationResult === 'string' && creationResult.startsWith('No ')) {
      return creationResult;
    }

    await this.deleteReservationUseCase.deleteReservation({
      date: currentDate,
      time: currentTime,
      name,
      phone
    });

    return `Tu reserva a nombre de ${name} se movió del ${currentDate} a las ${currentTime} al ${targetDate} a las ${targetTime}.`;
  }
}
