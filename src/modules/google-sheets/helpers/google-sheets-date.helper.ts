import { extractCalendarDate } from './names-match.helper';

export const formatCalendarDateToIso = (date: string): string | null => {
  const calendarDate = extractCalendarDate(date);

  if (!calendarDate) {
    return null;
  }

  const [day, month, year] = calendarDate.split('/');

  return `${year}-${month}-${day}`;
};

export const getNormalizedIsoDate = (date: string): string | null => {
  const trimmedDate = date.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return trimmedDate;
  }

  return formatCalendarDateToIso(trimmedDate);
};
