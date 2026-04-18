import { ServiceResponse, UpdateReservationOptions, UpdateReservationType } from 'src/lib';

export interface UpdateReservationJobData {
  reservation: UpdateReservationType;
  options?: UpdateReservationOptions;
}

export type UpdateReservationJobResult = ServiceResponse;
