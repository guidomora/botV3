import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReservationJobsRedisService } from './service/reservation-jobs-redis.service';

@Module({
  imports: [ConfigModule],
  providers: [ReservationJobsRedisService],
  exports: [ReservationJobsRedisService],
})
export class ReservationJobsModule {}
