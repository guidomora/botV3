export interface CreateReservationType {
  date?: string;
  time?: string;
  name: string;
  phone: string;
  quantity: number;
  excludedRowIndex?: number;
}

export interface CreateReservationOptions {
  skipAvailabilityRefresh?: boolean;
  allowLargeReservations?: boolean;
}

export interface CreateReservationTemporalType {
  date?: string;
  time?: string;
  name: string;
  phone: string;
  quantity: string;
}
