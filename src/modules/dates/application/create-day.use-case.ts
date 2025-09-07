import { Injectable, Logger } from "@nestjs/common";
import { GenerateDatetime } from "../dateTime-build/generate-datetime";
import { DateTime } from "src/lib/types/datetime/datetime.type";
import { SHEETS_NAMES } from "src/constants";
import { GoogleSheetsService } from "src/modules/google-sheets/service/google-sheets.service";
import { parseDate } from "../utils/parseDate";

@Injectable()
export class CreateDayUseCase {
    private readonly logger = new Logger(CreateDayUseCase.name);
    constructor(
        private readonly generateDatetime: GenerateDatetime,
        private readonly googleSheetsService: GoogleSheetsService,
    ) { }

    async createDate(): Promise<string> {
        try {
          const dateTime = this.createDateTime();
    
          const dateTimeWithBookings = this.createOneDayWithBookings();
    
          await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);
    
          await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:E`, dateTimeWithBookings);
    
          this.logger.log(`Se agrego el dia ${dateTime[3][0]}`, CreateDayUseCase.name);
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

                const nextDay = this.createNextDay(parsedDate);

                const dateTime: DateTime = this.createDateTime(nextDay);

                const nextDayWithBookings: DateTime = this.createOneDayWithBookings(nextDay);

                await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

                await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:E`, nextDayWithBookings);

            }
            this.logger.log(`Se agregaron ${quantity} dias`, CreateDayUseCase.name);
            return `Se agregaron ${quantity} dias`;
        } catch (error) {
            this.logger.error(`Error al agregar el dia`, error);
            throw error;
        }
    }

    async createNextDate(): Promise<string> {
        try {
            const lastRow = await this.googleSheetsService.getLastRowValue(`${SHEETS_NAMES[0]}!A:A`);

            const parsedDate = parseDate(lastRow);

            const nextDay = this.createNextDay(parsedDate);

            const dateTime: DateTime = this.createDateTime(nextDay);

            const nextDayWithBookings: DateTime = this.createOneDayWithBookings(nextDay);

            await this.googleSheetsService.appendRow(`${SHEETS_NAMES[0]}!A:C`, dateTime);

            await this.googleSheetsService.appendRow(`${SHEETS_NAMES[1]}!A:E`, nextDayWithBookings);

            this.logger.log(`Se agrego el dia ${dateTime[3][0]}`, CreateDayUseCase.name);
            return `Se agrego el dia ${dateTime[3][0]}`;
        } catch (error) {
            this.logger.error(`Error al agregar el dia`, error);
            throw error;
        }
    }

    public createDateTime(date?: string): DateTime {
        const dateTime = this.generateDatetime.createDateTime(date)
        return dateTime
    }

    public createOneDayWithBookings(date?: string): DateTime {
        const dateTime = this.generateDatetime.createOneDayWithBookings(date)
        return dateTime
    }

    public createNextDay(date: Date): string {
        const dateTime = this.generateDatetime.createNextDay(date)
        return dateTime
    }
}