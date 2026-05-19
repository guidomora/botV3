import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, MonthlyUsage, Plan, Subscription, UsageEvent } from './entities';
import { BillingPeriodService } from './service/billing-period.service';
import { UsageLimitService } from './service/usage-limit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Plan, Subscription, UsageEvent, MonthlyUsage])],
  providers: [BillingPeriodService, UsageLimitService],
  exports: [UsageLimitService],
})
export class BillingUsageModule {}
