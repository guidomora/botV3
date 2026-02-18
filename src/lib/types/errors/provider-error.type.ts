export enum ProviderName {
  OPEN_AI = 'OpenAI',
  GOOGLE_SHEETS = 'Google Sheets',
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: ProviderName,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
