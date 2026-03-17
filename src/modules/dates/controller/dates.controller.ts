import { Controller, Post, Body, Delete, UseGuards } from '@nestjs/common';
import { EnsureAgendaWindowResult } from 'src/lib';
import { DatesService } from '../service/dates.service';
import { AgendaSyncGuard } from '../guards/agenda-sync.guard';

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

  @Post('/ensure-agenda-window')
  @UseGuards(AgendaSyncGuard)
  ensureAgendaWindow(): Promise<EnsureAgendaWindowResult> {
    return this.datesService.ensureAgendaWindow();
  }

  @Delete('/delete-old-rows')
  deleteOldRows(): Promise<string | undefined> {
    return this.datesService.deleteOldRows();
  }
}
