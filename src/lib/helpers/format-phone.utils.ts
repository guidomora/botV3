export function formatPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D+/g, '');
  if (!digits) return null;

  const localNumber = digits.length > 10 ? digits.slice(-10) : digits;
  return `54-9-${localNumber}`;
}
