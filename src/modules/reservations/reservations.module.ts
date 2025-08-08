import { Module } from '@nestjs/common';
import { ReservationsService } from './service/reservations.service';
import { ReservationsController } from './controller/reservations.controller';
import { DatesModule } from 'src/modules/dates/dates.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatesModule, AiModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
