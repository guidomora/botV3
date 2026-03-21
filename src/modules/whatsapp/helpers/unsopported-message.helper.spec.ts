import { UnsupportedMessage } from './unsopported-message.helper';

describe('UnsupportedMessage', () => {
  it('should return true when media count is greater than zero', () => {
    expect(UnsupportedMessage('2', 'text')).toBe(true);
  });

  it('should return true for unsupported audio or image message types', () => {
    expect(UnsupportedMessage('0', ' Audio ')).toBe(true);
    expect(UnsupportedMessage('0', 'image')).toBe(true);
  });

  it('should return false for text messages without media', () => {
    expect(UnsupportedMessage('0', 'text')).toBe(false);
    expect(UnsupportedMessage(undefined, undefined)).toBe(false);
  });
});
