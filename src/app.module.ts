import { Module } from '@nestjs/common';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironmentVariables } from './config/env.validation';
import { DatesModule } from './modules/dates/dates.module';
import { GoogleSheetsModule } from './modules/google-sheets/google-sheets.module';
import { AiModule } from './modules/ai/ai.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { CacheContextModule } from './modules/cache-context/cache.module';
import { HealthModule } from './modules/health/health.module';
import { ReservationJobsModule } from './modules/reservation-jobs/reservation-jobs.module';

@Module({
  imports: [
    ReservationsModule,
    GoogleSheetsModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate: validateEnvironmentVariables,
    }),
    DatesModule,
    AiModule,
    WhatsAppModule.forRootAsync(),
    CacheContextModule,
    ReservationJobsModule,
    HealthModule,
  ],
})
export class AppModule {}
