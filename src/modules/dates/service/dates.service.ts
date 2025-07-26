import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/shared/service/google-sheets.service';
import { CreateDayUseCase } from '../aplication/create-day.use-case';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import { parseDate } from '../utils/parseDate';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);
  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}
  async createDate():Promise<string> {
    try {      
      const dateTime = this.createDayUseCase.createDateTime();
      
      const dateTimeWithBookings = this.createDayUseCase.createOneDayWithBookings();

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:C`, dateTimeWithBookings);

      this.logger.log(`Se agrego el dia ${dateTime[3][0]}`, DatesService.name);
      return `Se agrego el dia ${dateTime[3][0]}`;
    } catch (error) {
      this.logger.error(`Error al agregar el dia`, error);
      throw error;
    }
  }

  async createNextDate():Promise<string> {
    try {
      const lastRow = await this.googleSheetsService.getLasRowValue(`${SHEETS_NAMES[0]}!A:A`);      
      const parsedDate = parseDate(lastRow[4][0]);
      const nextDay = this.createDayUseCase.createNextDay(parsedDate);
      
      

      // this.logger.log(`Se agrego el dia ${dateTime[3][0]}`, DatesService.name);
      // return `Se agrego el dia ${dateTime[3][0]}`;
      return 'hola'
    } catch (error) {
      this.logger.error(`Error al agregar el dia`, error);
      throw error;
    }
  }

  removeDate(id: number) {
    return `This action removes a #${id} date`;
  }
}
