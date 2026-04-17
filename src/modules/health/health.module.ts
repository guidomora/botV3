import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controller/health.controller';
import { HealthSecretGuard } from './guards/health-secret.guard';
import { HealthRateLimitGuard } from './guards/health-rate-limit.guard';
import { HealthService } from './service/health.service';
import { ReservationJobsModule } from '../reservation-jobs/reservation-jobs.module';

@Module({
  imports: [ConfigModule, CacheModule.register({ ttl: 0 }), ReservationJobsModule],
  controllers: [HealthController],
  providers: [HealthService, HealthSecretGuard, HealthRateLimitGuard],
})
export class HealthModule {}
