import { Module } from '@nestjs/common';
import { ReservationsService } from './service/reservations.service';
import { ReservationsController } from './controller/reservations.controller';
import { DatesModule } from 'src/modules/dates/dates.module';
import { AiModule } from '../ai/ai.module';
import { GoogleSheetsModule } from 'src/modules/google-sheets/google-sheets.module';
import { CreateReservationStrategy } from './service/intention/create-reservation.strategy';
import { INTENTION_STRATEGIES, IntentionsRouter } from './service/intention/intention.router';
import { DeleteReservationStrategy } from './service/intention/delete-reservation.strategy';
import { CacheContextModule } from 'src/modules/cache-context/cache.module';
import { AvailabilityStrategy } from './service/intention/availability-reservation.strategy';
import { UpdateReservationStrategy } from './service/intention/update-reservation.strategy';

@Module({
  imports: [DatesModule, AiModule, GoogleSheetsModule.forRoot(), CacheContextModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    CreateReservationStrategy,
    DeleteReservationStrategy,
    AvailabilityStrategy,
    UpdateReservationStrategy,
    {
      provide: INTENTION_STRATEGIES,
      useFactory: (...strategies) => strategies,
      inject: [CreateReservationStrategy, DeleteReservationStrategy, AvailabilityStrategy, UpdateReservationStrategy]
    },

    IntentionsRouter,
  ],
  exports: [ReservationsService]
})
export class ReservationsModule {}
