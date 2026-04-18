import { CreateReservationOptions, CreateReservationType, ServiceResponse } from 'src/lib';

export interface CreateReservationJobData {
  reservation: CreateReservationType;
  options?: CreateReservationOptions;
}

export type CreateReservationJobResult = ServiceResponse;
