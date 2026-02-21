import { Controller } from '@nestjs/common';
import { ReservationsService } from '../service/reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // @Post('/multiple-messages')
  // createReservationWithMultipleMessages(@Body('message') createReservationDto: string) {
  //   return this.reservationsService.conversationOrchestrator(createReservationDto);
  // }
}
