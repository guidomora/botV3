export type AgendaSyncRequest = {
  method: string;
  originalUrl?: string;
  headers: Record<string, string | string[] | undefined>;
};
