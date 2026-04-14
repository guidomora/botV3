export type CreateChatCompletionParams = {
  model: string;
  responseFormat: 'json_object' | 'text';
  temperature?: number;
  systemPrompt: string;
  userMessage: string;
};

export const createOpenAiClientMock = () => {
  const createChatCompletion = jest.fn<Promise<string>, [CreateChatCompletionParams]>();

  return {
    createChatCompletion,
  };
};
