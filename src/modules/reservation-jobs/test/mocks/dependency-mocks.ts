export const createConfigServiceMock = (
  values: Record<string, string | number | boolean | undefined> = {},
) => ({
  get: jest.fn((key: string) => values[key]),
});
