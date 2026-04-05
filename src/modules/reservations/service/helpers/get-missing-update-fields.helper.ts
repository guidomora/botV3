import { UpdateReservationType } from 'src/lib';

export type UpdateField = keyof UpdateReservationType | 'changeTarget';

export interface UpdateMissingFields {
  current: UpdateField[];
  target: UpdateField[];
}

export function getMissingUpdateFields(state: UpdateReservationType): UpdateMissingFields {
  const current: UpdateField[] = [];

  if (!state.currentName) current.push('currentName');
  if (!state.phone) current.push('phone');
  if (!state.currentDate) current.push('currentDate');
  if (!state.currentTime) current.push('currentTime');

  const target: UpdateField[] = [];
  const hasCurrentReservationData = current.length === 0;
  const hasTarget = state.newDate || state.newTime || state.newName || state.newQuantity;

  if (hasCurrentReservationData && !hasTarget) {
    target.push('changeTarget');
  }

  return { current, target };
}
