import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservationsService } from '../service/reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) { }

  @Post('/create')
  create(
    @Body('message') createReservationDto: string) {
    return this.reservationsService.createReservation(createReservationDto);
  }

  @Post('/multiple-messages')
  createReservationWithMultipleMessages(@Body('message') createReservationDto: string) {
    return this.reservationsService.conversationOrchestrator(createReservationDto);
  }

  @Get('/availability')
  getAvailability(
    @Body('dateTime') dateTime: string) {
    return this.reservationsService.getAvailabilityRange(dateTime);
  }

  @Delete('/delete')
  deleteReservation(
    @Body('message') deleteMessage: string) {
    return this.reservationsService.deleteReservation(deleteMessage);
  }
}
