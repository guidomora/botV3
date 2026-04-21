export interface Availability {
  isAvailable: boolean;
  reservations: number;
  available: number;
}

export interface AvailabilitySlot {
  time: string;
  available_tables: number;
}

export interface AvailabilityResponse {
  date_label: string | null;
  is_closed_day: boolean;
  columns: ['time', 'available_tables'];
  slots: AvailabilitySlot[];
  summary: {
    first_time: string | null;
    last_time: string | null;
  };
}
