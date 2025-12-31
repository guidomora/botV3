export type UpdateReservationStage = 'identify' | 'reschedule';

export interface UpdateReservationType {
    name: string | null;
    phone: string | null;
    currentDate: string | null;
    currentTime: string | null;
    newDate: string | null;
    newTime: string | null;
    stage: UpdateReservationStage;
}
