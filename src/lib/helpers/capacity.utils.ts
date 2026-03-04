const parsePositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const computeOnlineMaxCapacity = (
  maxCapacityTotalValue: string | undefined,
  onlineBufferPercentValue: string | undefined,
): number => {
  const maxCapacityTotal = parsePositiveNumber(maxCapacityTotalValue, 50);
  const rawBufferPercent = Number(onlineBufferPercentValue ?? 0.15);

  const normalizedBuffer = Number.isNaN(rawBufferPercent)
    ? 0.15
    : rawBufferPercent > 1
      ? rawBufferPercent / 100
      : rawBufferPercent;

  const boundedBuffer = Math.min(Math.max(normalizedBuffer, 0), 1);

  return Math.floor(maxCapacityTotal * (1 - boundedBuffer));
};
