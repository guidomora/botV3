import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/google-sheets/service/google-sheets.service';
import { CreateDayUseCase } from '../aplication/create-day.use-case';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import { parseDate } from '../utils/parseDate';
import { DateTime } from 'src/lib/datetime/datetime.type';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);
  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
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
      const lastRow = await this.googleSheetsService.getLasRowValue(`${SHEETS_NAMES[0]}!A:A`);
      
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
        const lastRow = await this.googleSheetsService.getLasRowValue(`${SHEETS_NAMES[0]}!A:A`);

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

  async checkDate(date: string): Promise<boolean> {
    try {
      const dateExists = await this.googleSheetsService.checkDate(date)
      
      return dateExists;
    } catch (error) {
      this.logger.error(`Error al obtener el dia`, error);
      throw error;
    }
  }
}
