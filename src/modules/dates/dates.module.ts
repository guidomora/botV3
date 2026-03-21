import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
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
import { AgendaSyncSecurityService } from './service/agenda-sync-security.service';
import { AgendaSyncReplayService } from './service/agenda-sync-replay.service';
import { AgendaSyncRateLimitService } from './service/agenda-sync-rate-limit.service';

@Module({
  controllers: [DatesController],
  imports: [GoogleSheetsModule.forRoot(), CacheModule.register({ ttl: 0 })],
  providers: [
    DatesService,
    GenerateDatetime,
    CreateDayUseCase,
    CreateReservationRowUseCase,
    DeleteReservationUseCase,
    EnsureAgendaWindowUseCase,
    AgendaSyncGuard,
    AgendaSyncSecurityService,
    AgendaSyncReplayService,
    AgendaSyncRateLimitService,
  ],
  exports: [DatesService],
})
export class DatesModule {}
