const ACTION_KEYWORDS: RegExp[] = [
  /\breserv\w*\b/u,
  /\bmodific\w*\b/u,
  /\bcambi\w*\b/u,
  /\bcancel\w*\b/u,
  /\bdisponibilidad\b/u,
  /\bconsult\w*\b/u,
  /\bhorario\b/u,
  /\bfecha\b/u,
  /\bhoy\b/u,
  /\bmanana\b/u,
  /\bpasado manana\b/u,
  /\b\d{1,2}([:.]\d{2})?\b/u,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/u,
];

function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasExplicitReservationAction(message: string): boolean {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return false;
  }

  return ACTION_KEYWORDS.some((pattern) => pattern.test(normalizedMessage));
}
