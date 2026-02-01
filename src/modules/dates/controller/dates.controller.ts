import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { DatesService } from '../service/dates.service';
import { AddMissingFieldInput } from 'src/lib';

@Controller('dates')
export class DatesController {
  constructor(private readonly datesService: DatesService) {}

  @Post()
  create(): Promise<string> {
    return this.datesService.createDate();
  }
  
  @Post('/next-date')
  createNextDate(): Promise<string> {
    return this.datesService.createNextDate();
  }

  @Post('/x-dates')
  createXDates(@Body('quantity') quantity: number): Promise<string> {
    return this.datesService.createXDates(quantity);
  }

  @Delete('/delete-old-rows')
  deleteOldRows(): Promise<string | undefined> {
    return this.datesService.deleteOldRows();
  }

  @Post('/multiple-messages')
  createReservationWithMultipleMessages(@Body() createReservationDto: AddMissingFieldInput) {
    return this.datesService.createReservationWithMultipleMessages(createReservationDto);
  }
}
