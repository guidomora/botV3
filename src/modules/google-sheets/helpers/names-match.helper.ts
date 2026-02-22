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