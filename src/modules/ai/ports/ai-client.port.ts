export interface AiClientPort {
  createChatCompletion(params: {
    model: string;
    responseFormat: 'json_object' | 'text';
    temperature: number;
    systemPrompt: string;
    userMessage: string;
  }): Promise<string>;
}
