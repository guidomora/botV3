import { Injectable, Logger } from '@nestjs/common';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { DatesService } from 'src/modules/dates/service/dates.service';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);

    constructor(
      private readonly datesService:DatesService,
    ) { }
  
  async createReservation(createReservationDto: string) {
    // TODO: 
    // - think about the integration with openai to parse the data coming from the controller
    // await this.datesService.createReservation(createReservationDto);
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
