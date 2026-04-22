function padNumber(value: number, size = 2): string {
  return value.toString().padStart(size, '0');
}

export function formatSystemTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  const seconds = padNumber(date.getSeconds());
  const milliseconds = padNumber(date.getMilliseconds(), 3);
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const offsetSign = timezoneOffsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(timezoneOffsetMinutes);
  const offsetHours = padNumber(Math.floor(absoluteOffsetMinutes / 60));
  const offsetMinutes = padNumber(absoluteOffsetMinutes % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}
