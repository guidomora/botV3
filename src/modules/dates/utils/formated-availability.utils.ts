import { AvailabilityResponse, AvailabilitySlot } from 'src/lib';

export const formatAvailabilityResponse = (availabilityData: string[][]): AvailabilityResponse => {
  const rows = (availabilityData ?? [])
    .filter((r) => Array.isArray(r) && r.length >= 2)
    .filter((r) => r[0] && r[1]);

  if (rows.length === 0) {
    return {
      date_label: null,
      columns: ['time', 'available_tables'],
      slots: [],
      summary: { first_time: null, last_time: null },
    };
  }

  const date_label = rows[0][0];

  const requested = extractDdMmYyyy(date_label);
  const isToday = requested !== null && requested === todayDdMmYyyy();
  const minMinutes = isToday ? nowMinutesInTz() : -1;

  const slots: AvailabilitySlot[] = rows
    .map((r) => {
      const time = r[1];
      const available_tables = Number(r[3] ?? r[2] ?? 0);

      return {
        time,
        available_tables: Number.isFinite(available_tables) ? available_tables : 0,
      };
    })
    .filter((s) => s.available_tables > 0)
    .filter((s) => !isToday || timeToMinutes(s.time) >= minMinutes)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return {
    date_label,
    columns: ['time', 'available_tables'],
    slots,
    summary: {
      first_time: slots[0]?.time ?? null,
      last_time: slots[slots.length - 1]?.time ?? null,
    },
  };
};

const TZ = 'America/Argentina/Buenos_Aires';

// "sábado 13 de diciembre 2025 13/12/2025" -> "13/12/2025"
const extractDdMmYyyy = (dateLabel: string): string | null => {
  const m = dateLabel.match(/(\d{2}\/\d{2}\/\d{4})\s*$/);
  return m?.[1] ?? null;
};

const todayDdMmYyyy = (): string => {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date());

  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  return `${day}/${month}/${year}`;
};

const nowMinutesInTz = (): number => {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hh = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const mm = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return hh * 60 + mm;
};

const timeToMinutes = (t: string): number => {
  const [hh, mm] = t.split(':').map((n) => parseInt(n, 10));
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
};
