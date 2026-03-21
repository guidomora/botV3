import { Intention, RoleEnum, type ChatMessage } from 'src/lib';
import { serializeContext } from './serialize-context.utils';

describe('serializeContext', () => {
  it('should return an empty string when history is empty', () => {
    expect(serializeContext([])).toBe('');
  });

  it('should serialize role and content', () => {
    const history: ChatMessage[] = [{ role: RoleEnum.USER, content: 'hola' }];

    expect(serializeContext(history)).toBe('[user] hola');
  });

  it('should include intention when present', () => {
    const history: ChatMessage[] = [
      { role: RoleEnum.USER, content: 'quiero reservar', intention: Intention.CREATE },
    ];

    expect(serializeContext(history)).toBe('[user:create] quiero reservar');
  });

  it('should keep only the last 20 messages by default', () => {
    const history = Array.from({ length: 22 }, (_, index) => ({
      role: RoleEnum.USER,
      content: `mensaje-${index + 1}`,
    })) satisfies ChatMessage[];

    const serialized = serializeContext(history);
    const lines = serialized.split('\n');

    expect(lines).toHaveLength(20);
    expect(lines[0]).toBe('[user] mensaje-3');
    expect(lines[19]).toBe('[user] mensaje-22');
  });

  it('should respect a custom max amount of messages', () => {
    const history = Array.from({ length: 4 }, (_, index) => ({
      role: RoleEnum.ASSISTANT,
      content: `respuesta-${index + 1}`,
    })) satisfies ChatMessage[];

    expect(serializeContext(history, 2)).toBe('[assistant] respuesta-3\n[assistant] respuesta-4');
  });
});
