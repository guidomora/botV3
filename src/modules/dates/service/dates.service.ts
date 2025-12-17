import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { CreateReservationType } from 'src/lib/types/reservation/create-reservation.type';
import { AddMissingFieldInput, AddMissingFieldOutput, AvailabilityResponse, DeleteReservation, TemporalStatusEnum } from 'src/lib';
import { CreateDayUseCase, CreateReservationRowUseCase, DeleteReservationUseCase } from '../application';
import { GoogleTemporalSheetsService } from 'src/modules/google-sheets/service/google-temporal-sheet.service';
import { formatAvailabilityResponse } from '../utils/formated-availability.utils';

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

  async createReservationWithMultipleMessages(createReservationDto:AddMissingFieldInput): Promise<AddMissingFieldOutput> {
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

  async getDayAvailability(date:string):Promise<AvailabilityResponse>{
    const dates = await this.googleSheetsService.getDayAvailability(date)
    return formatAvailabilityResponse(dates)
  }
}
