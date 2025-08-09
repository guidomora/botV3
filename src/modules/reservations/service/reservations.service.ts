import { Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { AiService } from 'src/modules/ai/service/ai.service';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly aiService: AiService,
  ) { }

  async createReservation(createReservationDto: string): Promise<string> {
    const aiResponse = await this.aiService.sendMessage(createReservationDto);
    const { date, time, name, quantity } = aiResponse;

    // await this.datesService.createReservation(aiResponse);
    this.logger.log(`Reserva creada correctamente para el dia ${date} a las ${time} para ${name} y ${quantity} personas`, ReservationsService.name);
    return `Reserva creada correctamente para el dia ${date} a las ${time} para ${name} y ${quantity} personas`;
  }

  findReservation(id: number) {
    return `This action returns a #${id} reservation`;
  }

  updateReservation(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  removeReservation(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
