import { ServiceResponse, UpdateReservationType } from 'src/lib';

export interface UpdateReservationJobData {
  reservation: UpdateReservationType;
}

export type UpdateReservationJobResult = ServiceResponse;
