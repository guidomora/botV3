export interface BufferEntry {
  messages: string[];
  timer?: NodeJS.Timeout;
  resolvers?: Array<(value: string | undefined) => void>;
};