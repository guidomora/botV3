import { Module } from '@nestjs/common';
import { DatesService } from './service/dates.service';
import { DatesController } from './controller/dates.controller';
import { GoogleSheetsModule } from 'src/modules/google-sheets/google-sheets.module';
import { GenerateDatetime } from './dateTime-build/generate-datetime';
import {
  CreateDayUseCase,
  CreateReservationRowUseCase,
  DeleteReservationUseCase,
  EnsureAgendaWindowUseCase,
} from './application';
import { AgendaSyncGuard } from './guards/agenda-sync.guard';

@Module({
  controllers: [DatesController],
  imports: [GoogleSheetsModule.forRoot()],
  providers: [
    DatesService,
    GenerateDatetime,
    CreateDayUseCase,
    CreateReservationRowUseCase,
    DeleteReservationUseCase,
    EnsureAgendaWindowUseCase,
    AgendaSyncGuard,
  ],
  exports: [DatesService],
})
export class DatesModule {}
