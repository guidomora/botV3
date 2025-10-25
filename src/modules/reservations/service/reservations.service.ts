import { Injectable, Logger } from '@nestjs/common';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { AiService } from 'src/modules/ai/service/ai.service';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { AddMissingFieldInput, TemporalStatusEnum } from 'src/lib';
import { IntentionsRouter } from './intention/intention.router';
import { CacheService } from 'src/modules/cache-context/cache.service';
@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly aiService: AiService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly router: IntentionsRouter,
    private readonly cacheService: CacheService
  ) { }

  async createReservation(createReservationDto: string): Promise<string> {
    const aiResponse = await this.aiService.sendMessage(createReservationDto);

    const { date, time, name, quantity } = aiResponse;

    this.logger.log(`Reserva creada correctamente para el dia ${date} a las ${time} para ${name} y ${quantity} personas`, ReservationsService.name)

    return await this.datesService.createReservation(aiResponse);
  }

  async getAvailability(dateTime: string): Promise<string> {
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

  async deleteReservation(deleteMessage: string): Promise<string> {
    const aiResponse = await this.aiService.getCancelData(deleteMessage);

    return await this.datesService.deleteReservation(aiResponse)

  }

  async createReservationWithMultipleMessages(message: string): Promise<string> {
    const aiResponse = await this.aiService.interactWithAi(message);

    const mockedData: AddMissingFieldInput = {
      waId: '123',
      values: {
        phone: '1122334455',
        date: aiResponse.date,
        time: aiResponse.time,
        name: aiResponse.name,
        quantity: aiResponse.quantity,
      },
      messageSid: '123',
    }
    const response = await this.datesService.createReservationWithMultipleMessages(mockedData);


    switch (response.status) {
      case TemporalStatusEnum.IN_PROGRESS:
        return await this.aiService.getMissingData(response.missingFields);
      case TemporalStatusEnum.COMPLETED:
        return await this.aiService.reservationCompleted(response.reservationData);
      default:
        this.logger.warn(`Estado de reserva inesperado: ${response.status}`);
        return 'Hubo un problema al procesar la reserva, por favor intentá nuevamente.'
    }
  }

  async conversationOrchestrator(message: string) {
    const waId = "0000";
    const cachedContext = await this.cacheService.get(waId);
    if (cachedContext) {
      await this.cacheService.appendUserMessage(waId, message);
    }
    const cacheMessage = await this.cacheService.set(waId, message);
    const aiResponse = await this.aiService.interactWithAi(message);
    const result = await this.router.route(aiResponse);
    return result.reply;
  }

  updateReservation(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  removeReservation(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
