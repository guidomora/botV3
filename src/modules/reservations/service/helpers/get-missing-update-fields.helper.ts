import { UpdateReservationType } from 'src/lib';

export type UpdateField = keyof UpdateReservationType | 'changeTarget';

export interface UpdateMissingFields {
  current: UpdateField[];
  target: UpdateField[];
}

function normalizeText(value: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function quantitiesMatch(left: string | null, right: string | null): boolean {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft && !normalizedRight) {
    return true;
  }

  const leftNumber = Number(normalizedLeft);
  const rightNumber = Number(normalizedRight);

  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber === rightNumber;
  }

  return normalizedLeft === normalizedRight;
}

export function getMissingUpdateFields(state: UpdateReservationType): UpdateMissingFields {
  const current: UpdateField[] = [];

  if (!state.currentName) current.push('currentName');
  if (!state.phone) current.push('phone');
  if (!state.currentDate) current.push('currentDate');
  if (!state.currentTime) current.push('currentTime');

  const target: UpdateField[] = [];
  const hasCurrentReservationData = current.length === 0;
  const hasTarget =
    (state.newDate && normalizeText(state.newDate) !== normalizeText(state.currentDate)) ||
    (state.newTime && normalizeText(state.newTime) !== normalizeText(state.currentTime)) ||
    (state.newName && normalizeText(state.newName) !== normalizeText(state.currentName)) ||
    (state.newQuantity && !quantitiesMatch(state.newQuantity, state.currentQuantity));

  if (hasCurrentReservationData && !hasTarget) {
    target.push('changeTarget');
  }

  return { current, target };
}
