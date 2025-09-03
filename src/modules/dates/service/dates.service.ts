import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/google-sheets/service/google-sheets.service';
import { CreateReservationType } from 'src/lib/types/reservation/create-reservation.type';
import { DeleteReservation} from 'src/lib';
import { CreateDayUseCase, CreateReservationRowUseCase, DeleteReservationUseCase } from '../application';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);
  constructor(
    private readonly createDayUseCase: CreateDayUseCase,
    private readonly createReservationRowUseCase: CreateReservationRowUseCase,
    private readonly deleteReservationUseCase: DeleteReservationUseCase,
    private readonly googleSheetsService: GoogleSheetsService,
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
}
