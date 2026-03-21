import { Intention, RoleEnum, type ChatMessage } from 'src/lib';
import { inferActiveIntent } from './active-intent.utils';

describe('inferActiveIntent', () => {
  it('should return null when history is empty', () => {
    expect(inferActiveIntent([])).toBeNull();
  });

  it('should return null when no message has an intention', () => {
    const history: ChatMessage[] = [
      { role: RoleEnum.USER, content: 'hola' },
      { role: RoleEnum.ASSISTANT, content: 'buenas' },
    ];

    expect(inferActiveIntent(history)).toBeNull();
  });

  it('should return the most recent intention in history', () => {
    const history: ChatMessage[] = [
      { role: RoleEnum.USER, content: 'quiero reservar', intention: Intention.CREATE },
      { role: RoleEnum.ASSISTANT, content: 'ok' },
      { role: RoleEnum.USER, content: 'quiero consultar', intention: Intention.AVAILABILITY },
    ];

    expect(inferActiveIntent(history)).toBe(Intention.AVAILABILITY);
  });
});
