export const parseJsonResponse = <T>(response: string): T => {
  const parsed: unknown = JSON.parse(response);
  return parsed as T;
};