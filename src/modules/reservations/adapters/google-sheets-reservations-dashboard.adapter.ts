import { Injectable } from '@nestjs/common';
import { DashboardAvailableDates, DashboardReservation, DashboardReservationSlot } from 'src/lib';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

@Injectable()
export class GoogleSheetsReservationsDashboardAdapter implements ReservationsDashboardReadPort {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  getAvailableDates(): Promise<DashboardAvailableDates> {
    return this.googleSheetsService.getAvailableReservationDates();
  }

  getReservationsByDate(date: string): Promise<DashboardReservation[]> {
    return this.googleSheetsService.getReservationsByDate(date);
  }

  getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]> {
    return this.googleSheetsService.getAvailabilitySlotsByDate(date);
  }
}
