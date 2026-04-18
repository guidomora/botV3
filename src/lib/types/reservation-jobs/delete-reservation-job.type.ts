import { DeleteReservation } from 'src/lib';

export interface DeleteReservationJobData {
  reservation: DeleteReservation;
}

export type DeleteReservationJobResult = string;
