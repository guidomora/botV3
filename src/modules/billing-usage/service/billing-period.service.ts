import { Injectable } from '@nestjs/common';
import { BillingPeriodBounds } from 'src/lib';

@Injectable()
export class BillingPeriodService {
  getCurrentPeriod(now = new Date()): string {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
  }

  getPeriodBounds(period: string): BillingPeriodBounds {
    const [yearValue, monthValue] = period.split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

    return { start, end };
  }
}
