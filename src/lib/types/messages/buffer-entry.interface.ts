export interface BufferEntry {
  messages: string[];
  timer?: NodeJS.Timeout;
  resolvers?: Array<{ id: number; resolve: (value: string | undefined) => void }>;
  sequence?: number;
};
