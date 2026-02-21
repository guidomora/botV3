export interface CreateReservationType {
  date?: string;
  time?: string;
  name: string;
  phone: string;
  quantity: number;
}

export interface CreateReservationTemporalType {
  date?: string;
  time?: string;
  name: string;
  phone: string;
  quantity: string;
}
