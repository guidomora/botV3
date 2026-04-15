const normalizeName = (name?: string | null): string => {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

export const namesMatch = (inputName?: string | null, rowName?: string | null): boolean => {
  const normalizedInputName = normalizeName(inputName);
  const normalizedRowName = normalizeName(rowName);

  if (!normalizedInputName || !normalizedRowName) {
    return false;
  }

  return (
    normalizedRowName === normalizedInputName ||
    normalizedRowName.includes(normalizedInputName) ||
    normalizedInputName.includes(normalizedRowName)
  );
};

export const normalizeDateLabel = (date?: string): string => {
  return date?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
};

export const extractCalendarDate = (date?: string): string | null => {
  if (!date) return null;

  const ddMmYyyyMatch = date.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
  if (ddMmYyyyMatch?.[0]) {
    return ddMmYyyyMatch[0];
  }

  const isoMatch = date.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (!isoMatch?.[0]) {
    return null;
  }

  const [year, month, day] = isoMatch[0].split('-');
  return `${day}/${month}/${year}`;
};

export const datesMatch = (leftDate?: string, rightDate?: string): boolean => {
  if (!leftDate || !rightDate) return false;

  const leftCalendarDate = extractCalendarDate(leftDate);
  const rightCalendarDate = extractCalendarDate(rightDate);

  if (leftCalendarDate && rightCalendarDate) {
    return leftCalendarDate === rightCalendarDate;
  }

  return normalizeDateLabel(leftDate) === normalizeDateLabel(rightDate);
};
