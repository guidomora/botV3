import { Module } from '@nestjs/common';
import { ReservationsService } from './service/reservations.service';
import { ReservationsController } from './controller/reservations.controller';
import { DatesModule } from 'src/modules/dates/dates.module';
import { AiModule } from '../ai/ai.module';
import { GoogleSheetsModule } from 'src/modules/google-sheets/google-sheets.module';
import { CreateReservationStrategy } from './service/strategy-intetion-flow/create-reservation.strategy';
import { INTENTION_STRATEGIES, IntentionsRouter } from './service/strategy-intetion-flow/intention-context';

@Module({
  imports: [DatesModule, AiModule, GoogleSheetsModule.forRoot()],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,

    CreateReservationStrategy,
    {
      provide: INTENTION_STRATEGIES,
      useFactory: (...strategies) => strategies,
      inject: [CreateReservationStrategy],
    },

    IntentionsRouter,
  ],
})
export class ReservationsModule {}
