export interface UpdateParams {
  reservations: number;
  available: number;
  date: string;
  time: string;
}

export interface UpdateParamsRepository {
  reservations: number;
  available: number;
}
