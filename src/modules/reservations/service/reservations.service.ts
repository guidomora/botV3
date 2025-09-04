import { Injectable, Logger } from '@nestjs/common';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { AiService } from 'src/modules/ai/service/ai.service';
import { GoogleSheetsService } from 'src/google-sheets/service/google-sheets.service';
import { SHEETS_NAMES } from 'src/constants';
import { SearchAvailability } from 'src/lib';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly aiService: AiService,
    private readonly googleSheetsService: GoogleSheetsService,
  ) { }

  async createReservation(createReservationDto: string): Promise<string> {
    const aiResponse = await this.aiService.sendMessage(createReservationDto);
    
    const { date, time, name, quantity } = aiResponse;

    this.logger.log(`Reserva creada correctamente para el dia ${date} a las ${time} para ${name} y ${quantity} personas`, ReservationsService.name)
    
    return await this.datesService.createReservation(aiResponse);
  }

  async getAvailability(dateTime: string):Promise<string> {
    const aiResponse = await this.aiService.getAvailabilityData(dateTime);

    const { date, time } = aiResponse;

    const index = await this.googleSheetsService.getDate(date, time);


    if (index === -1) {
      return 'No se encontro la fecha'
    }

    const availability = await this.googleSheetsService.getAvailability(date!, time!);
    
    if (!availability.isAvailable) {
      return 'No hay disponibilidad para esa fecha y horario'
    }
    
    return `Disponibilidad para el dia ${date} a las ${time}`
  }

  async deleteReservation(deleteMessage:string):Promise<string>{
    const aiResponse = await this.aiService.getCancelData(deleteMessage);

    return await this.datesService.deleteReservation(aiResponse)
    
  }

  updateReservation(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  removeReservation(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
