import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/google-sheets/service/google-sheets.service';
import { CreateDayUseCase } from '../application/create-day.use-case';
import { parseDate } from '../utils/parseDate';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { CreateReservationType } from 'src/lib/types/reservation/create-reservation.type';
import { SHEETS_NAMES } from 'src/constants';
import { DeleteReservation, ReservationOperation, UpdateParams } from 'src/lib';
import { CreateReservationRowUseCase } from '../application/create-reservation-row.use-case';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);
  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
    private readonly createReservationRowUseCase: CreateReservationRowUseCase,
    private readonly googleSheetsService: GoogleSheetsService,
  ) { }
  async createDate(): Promise<string> {
    try {
      const dateTime = this.createDayUseCase.createDateTime();

      const dateTimeWithBookings = this.createDayUseCase.createOneDayWithBookings();

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:E`, dateTimeWithBookings);

      this.logger.log(`Se agrego el dia ${dateTime[3][0]}`, DatesService.name);
      return `Se agrego el dia ${dateTime[3][0]}`;
    } catch (error) {
      this.logger.error(`Error al agregar el dia`, error);
      throw error;
    }
  }

  async createNextDate(): Promise<string> {
    try {
      const lastRow = await this.googleSheetsService.getLastRowValue(`${SHEETS_NAMES[0]}!A:A`);

      const parsedDate = parseDate(lastRow);

      const nextDay = this.createDayUseCase.createNextDay(parsedDate);

      const dateTime: DateTime = this.createDayUseCase.createDateTime(nextDay);

      const nextDayWithBookings: DateTime = this.createDayUseCase.createOneDayWithBookings(nextDay);

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:E`, nextDayWithBookings);

      this.logger.log(`Se agrego el dia ${dateTime[3][0]}`, DatesService.name);
      return `Se agrego el dia ${dateTime[3][0]}`;
    } catch (error) {
      this.logger.error(`Error al agregar el dia`, error);
      throw error;
    }
  }

  async createXDates(quantity: number): Promise<string> {
    try {
      for (let i = 0; i < quantity; i++) {
        const lastRow = await this.googleSheetsService.getLastRowValue(`${SHEETS_NAMES[0]}!A:A`);

        const parsedDate = parseDate(lastRow);

        const nextDay = this.createDayUseCase.createNextDay(parsedDate);

        const dateTime: DateTime = this.createDayUseCase.createDateTime(nextDay);

        const nextDayWithBookings: DateTime = this.createDayUseCase.createOneDayWithBookings(nextDay);

        await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

        await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:E`, nextDayWithBookings);

      }
      this.logger.log(`Se agregaron ${quantity} dias`, DatesService.name);
      return `Se agregaron ${quantity} dias`;
    } catch (error) {
      this.logger.error(`Error al agregar el dia`, error);
      throw error;
    }
  }

  async createReservation(createReservation: CreateReservationType) {
    const { date, time, name, phone, quantity } = createReservation;

    try {
      const index = await this.googleSheetsService.getDate(date!, time!)

      if (index === -1) {
        return 'No se encontro la fecha'
      }

      const availability = await this.googleSheetsService.getAvailability(date!, time!)

      if (!availability.isAvailable) {
        return 'No hay disponibilidad para esa fecha y horario'
      }

      const currentRow = await this.googleSheetsService.getRowValues(`${SHEETS_NAMES[0]}!A${index}:F${index}`)


      if (currentRow[2] != undefined && currentRow[3] != undefined && currentRow[4] != undefined && currentRow[5] != undefined) {
        const newRowData = {
          date: String(currentRow[0]),
          time: String(currentRow[1]),
          name,
          phone,
          quantity
        }

        await this.createReservationRowUseCase.createReservationAndRow(index, newRowData)
      } else {
        const customerData = { name, phone, quantity }
        await this.googleSheetsService.createReservation(`${SHEETS_NAMES[0]}!C${index}:F${index}`, { customerData })
      }

      const updateParams: UpdateParams = {
        reservations: availability.reservations,
        available: availability.available,
        date: date!,
        time: time!
      }

      await this.googleSheetsService.updateAvailability(ReservationOperation.ADD, updateParams)

      return `Reserva creada correctamente para el dia ${date} a las ${time} para ${name} y ${quantity} personas`
    } catch (error) {
      this.logger.error(`Error al agregar la reserva`, error);
      throw error;
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
    const { phone, date, time, name } = deleteReservation;
    
    try {

      const index = await this.googleSheetsService.getDateIndexByData(date!, time!, name!, phone!)

      if (index === -1) {
        return 'No se encontro la fecha'
      }
      
      const dates = await this.googleSheetsService.getDatetimeDates(date!, time!)
      
      if (dates.length === 1) {
        await this.googleSheetsService.deleteReservation(`${SHEETS_NAMES[0]}!C${index}:F${index}`)
      } else {
        await this.googleSheetsService.deleteRow(index, 0)
      }

      const availability = await this.googleSheetsService.getAvailability(date!, time!)

      const updateParams: UpdateParams = {
        reservations: availability.reservations,
        available: availability.available,
        date: date!,
        time: time!
      }

      await this.googleSheetsService.updateAvailability(ReservationOperation.SUBTRACT, updateParams)
      this.logger.log(`Reserva eliminada correctamente para el dia ${date} a las ${time} para ${phone}`, DatesService.name)

      return 'Reserva eliminada correctamente'
    } catch (error) {
      this.logger.error(`Error al eliminar la reserva`, error);
      throw error;
    }
  }
}
