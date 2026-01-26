import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { CreateReservationType } from 'src/lib/types/reservation/create-reservation.type';
import { AddMissingFieldInput, AddMissingFieldOutput, AvailabilityResponse, DeleteReservation, GetIndexParams, ServiceResponse, StatusEnum, TemporalStatusEnum, UpdateReservationType } from 'src/lib';
import { CreateDayUseCase, CreateReservationRowUseCase, DeleteReservationUseCase } from '../application';
import { GoogleTemporalSheetsService } from 'src/modules/google-sheets/service/google-temporal-sheet.service';
import { pickAvailabilityForTime, formatAvailabilityResponse } from '../utils';
import { SHEETS_NAMES } from 'src/constants';
import { log } from 'console';

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

  async createReservation(createReservation: CreateReservationType): Promise<ServiceResponse> {
    return this.createReservationRowUseCase.createReservation(createReservation)
  }

  async createReservationWithMultipleMessages(createReservationDto: AddMissingFieldInput): Promise<AddMissingFieldOutput> {
    const reservation = await this.googleSheetsTemporalService.addMissingField(createReservationDto);

    const { date, time, name, phone, quantity } = reservation.snapshot;
    if (reservation.status === TemporalStatusEnum.COMPLETED) {
      const customerData = {
        date: date!.toLowerCase(),
        time: time!.toLowerCase(),
        name: name!.toLowerCase(),
        phone: phone!.toLowerCase(),
        quantity: Number(quantity!)
      }

      const createResponse = await this.createReservationRowUseCase.createReservation(customerData);
      if (createResponse.error) {
        if (createResponse.status === StatusEnum.DATE_ALREADY_PASSED) {
          return {
            status: TemporalStatusEnum.IN_PROGRESS,
            missingFields: ['date', 'time'],
            reservationData: reservation.snapshot
          }
        }
        return {
          status: TemporalStatusEnum.FAILED,
          missingFields: reservation.missingFields,
          reservationData: reservation.snapshot,
          message: createResponse.message
        }
      }
      this.logger.log('Reserva trasladada a hoja de reservas');

      await this.googleSheetsService.deleteRow(reservation.rowIndex, 2);

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

    this.logger.log('Updating reservation', DatesService.name);

    const { currentDate, currentTime, newDate, newTime, currentName, phone, newQuantity, newName } = updateReservation;

    if (!currentDate || !currentTime || !currentName || !phone) {
      return 'Faltan datos de la reserva original';
    }

    const targetDate = newDate ?? currentDate;
    const targetTime = newTime ?? currentTime;
    const targetName = newName ?? currentName;

    console.log(currentDate, currentTime, currentName, phone);

    const searchIndexObject: GetIndexParams = {
      date: currentDate,
      time: currentTime,
      name: currentName.toLowerCase(),
      phone
    }

    const currentReservationIndex = await this.googleSheetsService.getDateIndexByData(searchIndexObject);

    console.log('currentReservationIndex: ', currentReservationIndex);


    if (currentReservationIndex === -1) {
      return 'No se encontró la reserva con los datos proporcionados.';
    }

    const currentRow = await this.googleSheetsService.getRowValues(`${SHEETS_NAMES[0]}!A${currentReservationIndex}:F${currentReservationIndex}`);

    const parseValue = (value: unknown) => Array.isArray(value) ? value[0] : value;

    const quantity = Number(parseValue(currentRow?.[5])) || 1;

    const resolvedQuantity = newQuantity && !Number.isNaN(Number(newQuantity)) ? Number(newQuantity) : quantity;

    const createRange = `${SHEETS_NAMES[0]}!C${currentReservationIndex}:F${currentReservationIndex}`

    if (targetDate === currentDate && targetTime === currentTime) {
      await this.googleSheetsService.createReservation(
        createRange,
        {
          customerData: {
            name: targetName.toLowerCase(),
            phone,
            quantity: resolvedQuantity,
          },
        },
      );

      this.logger.log('Reservation updated', DatesService.name);
      return `Tu reserva a nombre de ${currentName} se actualizó a nombre de ${targetName} para ${resolvedQuantity} personas el ${currentDate} a las ${currentTime}.`;
    }

    const availability = await this.googleSheetsService.getAvailability(targetDate, targetTime);

    if (!availability.isAvailable) {
      return 'No hay disponibilidad para la nueva fecha y horario solicitados.';
    }

    const createObject: CreateReservationType = {
      date: targetDate.toLowerCase(),
      time: targetTime,
      name: targetName.toLowerCase(),
      phone,
      quantity: resolvedQuantity
    }

    const creationResult: ServiceResponse = await this.createReservationRowUseCase.createReservation(createObject);

    if (creationResult.error) {
      return creationResult.message;
    }

    const deleteObject: DeleteReservation = {
      date: currentDate,
      time: currentTime,
      name: currentName,
      phone
    }

    await this.deleteReservationUseCase.deleteReservation(deleteObject);

    return `Tu reserva a nombre de ${currentName} se movió del ${currentDate} a las ${currentTime} al ${targetDate} a las ${targetTime} para ${resolvedQuantity} personas a nombre de ${targetName}.`;
  }
}
