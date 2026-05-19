import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironmentVariables } from './config/env.validation';
import { AiModule } from './modules/ai/ai.module';
import { CacheContextModule } from './modules/cache-context/cache.module';
import { BillingUsageModule } from './modules/billing-usage/billing-usage.module';
import { DatabaseModule } from './modules/database/database.module';
import { DatesModule } from './modules/dates/dates.module';
import { GoogleSheetsModule } from './modules/google-sheets/google-sheets.module';
import { HealthModule } from './modules/health/health.module';
import { ReservationJobsModule } from './modules/reservation-jobs/reservation-jobs.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate: validateEnvironmentVariables,
    }),
    DatabaseModule,
    BillingUsageModule,
    ReservationsModule,
    GoogleSheetsModule.forRoot(),
    DatesModule,
    AiModule,
    WhatsAppModule.forRootAsync(),
    CacheContextModule,
    ReservationJobsModule,
    HealthModule,
  ],
})
export class AppModule {}
