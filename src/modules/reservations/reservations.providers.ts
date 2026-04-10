import { Provider } from '@nestjs/common';
import { GoogleSheetsReservationsDashboardAdapter } from './adapters/google-sheets-reservations-dashboard.adapter';
import { RESERVATIONS_DASHBOARD_READ_PORT } from './reservations.tokens';

export const reservationsProviders: Provider[] = [
  GoogleSheetsReservationsDashboardAdapter,
  {
    provide: RESERVATIONS_DASHBOARD_READ_PORT,
    useExisting: GoogleSheetsReservationsDashboardAdapter,
  },
];
