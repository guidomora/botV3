import { Intention } from './intention.enum';

export interface UpdateAiResponse {
  intent: Intention.UPDATE;
  currentDate?: string | null;
  currentTime?: string | null;
  currentName?: string | null;
  currentPhone?: string | null;
  newDate?: string | null;
  newTime?: string | null;
  newName?: string | null;
  newQuantity?: string | null;
  useCurrentPhone?: boolean | null;
}
