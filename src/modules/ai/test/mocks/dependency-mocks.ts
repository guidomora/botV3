export type OpenAiCreateParams = {
  model: string;
  response_format: { type: 'json_object' | 'text' };
  temperature: number;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
};

export const createOpenAiConfigMock = () => {
  const create = jest.fn<
    Promise<{ choices: Array<{ message: { content: string } }> }>,
    [OpenAiCreateParams]
  >();

  return {
    getClient: jest.fn(() => ({
      chat: {
        completions: {
          create,
        },
      },
    })),
    create,
  };
};
