export type UpdateReservationStage = 'identify' | 'reschedule';

export interface UpdateReservationType {
    currentName: string | null;
    phone: string | null;
    currentDate: string | null;
    currentTime: string | null;
    currentQuantity: string | null;
    newDate: string | null;
    newTime: string | null;
    newName: string | null;
    newQuantity: string | null;
    stage: UpdateReservationStage;
}