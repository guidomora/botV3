export const createConfigServiceMock = (
  values: Record<string, string | number | undefined> = {},
) => ({
  get: jest.fn((key: string) => values[key]),
});

export const createExecutionContextMock = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as never;
