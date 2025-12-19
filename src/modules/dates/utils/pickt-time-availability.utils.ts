import { AvailabilityResponse, AvailabilitySlot } from "src/lib";

const timeToMinutes = (t: string): number => {
  const [hh, mm] = t.split(":").map(n => parseInt(n, 10));
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
};

export const pickAvailabilityForTime = (day: AvailabilityResponse, requestedTime: string, options?: { neighborCount?: number }): AvailabilityResponse => {
  const neighborCount = options?.neighborCount ?? 2;

  // Normalizar/ordenar
  const slots = [...(day.slots ?? [])].sort(
    (slotA, slotB) => timeToMinutes(slotA.time) - timeToMinutes(slotB.time),
  );

  // 1) Match exacto
  const exact = slots.find(slot => slot.time === requestedTime);
  if (exact) {
    return {
      ...day,
      slots: [exact],
      summary: { first_time: exact.time, last_time: exact.time },
    };
  }

  // 2) No hay exacto -> sugerir cercanos
  if (slots.length === 0) {
    return { ...day, slots: [], summary: { first_time: null, last_time: null } };
  }

  const reqMin = timeToMinutes(requestedTime);

  // Encontrar índice de inserción (primer slot >= requested)
  let idx = slots.findIndex(slot => timeToMinutes(slot.time) >= reqMin);
  if (idx === -1) idx = slots.length; // requested es más tarde que todo

  const suggestions: AvailabilitySlot[] = [];

  // Alternar alrededor: 1 antes, 1 después, repetir
  let left = idx - 1;
  let right = idx;

  while (suggestions.length < neighborCount && (left >= 0 || right < slots.length)) {
    if (left >= 0) suggestions.push(slots[left--]);
    if (suggestions.length >= neighborCount) break;
    if (right < slots.length) suggestions.push(slots[right++]);
  }

  // Ordenar sugerencias para que salgan cronológicas
  suggestions.sort((slotA, slotB) => timeToMinutes(slotA.time) - timeToMinutes(slotB.time));

  return {
    ...day,
    slots: suggestions,
    summary: {
      first_time: suggestions[0]?.time ?? null,
      last_time: suggestions[suggestions.length - 1]?.time ?? null,
    },
  };
};