import { ChatMessage } from 'src/lib';

export function serializeContext(history: ChatMessage[], max = 20) {
  return history
    .slice(-max)
    .map((m) => `[${m.role}${m.intention ? `:${m.intention}` : ''}] ${m.content}`)
    .join('\n');
}
