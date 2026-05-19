import { Module } from '@nestjs/common';
import { ReservationsService } from './service/reservations.service';
import { DatesModule } from 'src/modules/dates/dates.module';
import { AiModule } from '../ai/ai.module';
import { GoogleSheetsModule } from 'src/modules/google-sheets/google-sheets.module';
import { CreateReservationStrategy } from './service/intention/create-reservation.strategy';
import { INTENTION_STRATEGIES, IntentionsRouter } from './service/intention/intention.router';
import { DeleteReservationStrategy } from './service/intention/delete-reservation.strategy';
import { CacheContextModule } from 'src/modules/cache-context/cache.module';
import { AvailabilityStrategy } from './service/intention/availability-reservation.strategy';
import { UpdateReservationStrategy } from './service/intention/update-reservation.strategy';
import { OtherStrategy } from './service/intention/other.strategy';
import { ReservationsController } from './controller/reservations.controller';
import { ReservationsDashboardService } from './service/reservations-dashboard.service';
import { GetAvailableReservationDatesUseCase } from './application/get-available-reservation-dates.use-case';
import { GetDailyReservationSlotsUseCase } from './application/get-daily-reservation-slots.use-case';
import { GetDailyReservationsSummaryUseCase } from './application/get-daily-reservations-summary.use-case';
import { DeleteDashboardReservationUseCase } from './application/delete-dashboard-reservation.use-case';
import { UpdateDashboardReservationUseCase } from './application/update-dashboard-reservation.use-case';
import { CreateDashboardReservationUseCase } from './application/create-dashboard-reservation.use-case';
import { CloseDashboardDayUseCase } from './application/close-dashboard-day.use-case';
import { CloseDashboardSlotUseCase } from './application/close-dashboard-slot.use-case';
import { GetClosureNotificationFailuresUseCase } from './application/get-closure-notification-failures.use-case';
import { OpenDashboardDayUseCase } from './application/open-dashboard-day.use-case';
import { OpenDashboardSlotUseCase } from './application/open-dashboard-slot.use-case';
import { reservationsProviders } from './reservations.providers';
import { InternalApiTokenGuard } from './guards/internal-api-token.guard';
import { ReservationJobsModule } from '../reservation-jobs/reservation-jobs.module';
import { BillingUsageModule } from '../billing-usage/billing-usage.module';

@Module({
  controllers: [ReservationsController],
  imports: [
    DatesModule,
    AiModule,
    GoogleSheetsModule.forRoot(),
    CacheContextModule,
    ReservationJobsModule,
    BillingUsageModule,
  ],
  providers: [
    ReservationsService,
    ReservationsDashboardService,
    CreateDashboardReservationUseCase,
    GetAvailableReservationDatesUseCase,
    GetDailyReservationSlotsUseCase,
    GetDailyReservationsSummaryUseCase,
    DeleteDashboardReservationUseCase,
    UpdateDashboardReservationUseCase,
    CloseDashboardDayUseCase,
    CloseDashboardSlotUseCase,
    GetClosureNotificationFailuresUseCase,
    OpenDashboardDayUseCase,
    OpenDashboardSlotUseCase,
    InternalApiTokenGuard,
    CreateReservationStrategy,
    DeleteReservationStrategy,
    AvailabilityStrategy,
    UpdateReservationStrategy,
    OtherStrategy,
    ...reservationsProviders,
    {
      provide: INTENTION_STRATEGIES,
      useFactory: (
        createReservationStrategy: CreateReservationStrategy,
        deleteReservationStrategy: DeleteReservationStrategy,
        availabilityStrategy: AvailabilityStrategy,
        updateReservationStrategy: UpdateReservationStrategy,
        otherStrategy: OtherStrategy,
      ) => [
        createReservationStrategy,
        deleteReservationStrategy,
        availabilityStrategy,
        updateReservationStrategy,
        otherStrategy,
      ],
      inject: [
        CreateReservationStrategy,
        DeleteReservationStrategy,
        AvailabilityStrategy,
        UpdateReservationStrategy,
        OtherStrategy,
      ],
    },

    IntentionsRouter,
  ],
  exports: [ReservationsService, ReservationsDashboardService],
})
export class ReservationsModule {}
