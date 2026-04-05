import { UpdateReservationType } from './update-reservation.type';

export interface UpdateReservationContextType {
  currentDate: string;
  currentTime: string;
  currentName: string;
  phone: string;
  newQuantity?: UpdateReservationType['newQuantity'];
  formattedPhone: string;
  targetDate: string;
  targetTime: string;
  targetName: string;
  currentReservationDateTime: Date;
  targetReservationDateTime: Date;
}

export interface UpdateReservationResolvedType {
  currentReservationIndex: number;
  resolvedQuantity: number;
  createRange: string;
}
