import { parseJsonResponse } from './parse-response';

describe('parseJsonResponse', () => {
  it('should parse a valid json response', () => {
    expect(parseJsonResponse<{ ok: boolean; value: number }>('{"ok":true,"value":2}')).toEqual({
      ok: true,
      value: 2,
    });
  });

  it('should throw when json is invalid', () => {
    expect(() => parseJsonResponse('{invalid-json}')).toThrow(SyntaxError);
  });
});
