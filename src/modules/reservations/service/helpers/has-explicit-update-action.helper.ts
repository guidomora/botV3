const UPDATE_KEYWORDS: RegExp[] = [
  /\bmodific\w*\b/u,
  /\bcambi\w*\b/u,
  /\bmover\w*\b/u,
  /\breprogram\w*\b/u,
  /\bpasar\w*\b/u,
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

export function hasExplicitUpdateAction(message: string): boolean {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return false;
  }

  return UPDATE_KEYWORDS.some((pattern) => pattern.test(normalizedMessage));
}
