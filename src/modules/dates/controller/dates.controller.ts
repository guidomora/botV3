import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { DatesService } from '../service/dates.service';

@Controller('dates')
export class DatesController {
  constructor(private readonly datesService: DatesService) {}

  @Post()
  create(): Promise<string> {
    return this.datesService.createDate();
  }

  @Get()
  checkDate(
    @Body('date') date: string
  ): Promise<boolean> {
    return this.datesService.checkDate(date);
  }
  
  @Post('/next-date')
  createNextDate(): Promise<string> {
    return this.datesService.createNextDate();
  }

  @Post('/x-dates')
  createXDates(@Body('quantity') quantity: number): Promise<string> {
    return this.datesService.createXDates(quantity);
  }
}
