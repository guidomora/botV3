import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/shared/google-sheets/google-sheets.service';
import { CreateDayUseCase } from '../aplication/create-day.use-case';
import { SHEETS_NAMES } from 'src/shared/constants/sheets-name/sheets-name';

@Injectable()
export class DatesService {
  constructor(private readonly googleSheetsService: GoogleSheetsService,
    private readonly createDayUseCase: CreateDayUseCase
  ) {}
  async createDate():Promise<string> {
    try {
      const dateTime = this.createDayUseCase.createDateTime();
      
      const dateTimeWithBookings = this.createDayUseCase.createOneDayWithBookings();

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

      await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:C`, dateTimeWithBookings);

      Logger.log(`Se agrego el dia ${dateTime[3][0]}`, DatesService.name);
      return `Se agrego el dia ${dateTime[3][0]}`;
    } catch (error) {
      this.googleSheetsService.failure(error);
    }
  }

  findDate(id: number) {
    return `This action returns a #${id} date`;
  }

  removeDate(id: number) {
    return `This action removes a #${id} date`;
  }
}
