import { DeleteReservation } from 'src/lib';

export function getMissingFields(state: DeleteReservation): (keyof DeleteReservation)[] {
  const out: (keyof DeleteReservation)[] = [];
  (['phone', 'date', 'time', 'name'] as (keyof DeleteReservation)[]).forEach((value) => {
    if (state[value] == null || state[value] === '') out.push(value);
  });
  return out;
}
