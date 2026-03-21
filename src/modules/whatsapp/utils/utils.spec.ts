import { setTimeLapse } from './utils';

describe('setTimeLapse', () => {
  it('should wait longer for very short messages', () => {
    expect(setTimeLapse('hola')).toBe(25000);
  });

  it('should use intermediate wait for medium messages', () => {
    expect(setTimeLapse('quiero reservar')).toBe(10000);
  });

  it('should use shortest wait for long messages', () => {
    expect(setTimeLapse('quiero reservar para cuatro personas manana a las nueve')).toBe(7000);
  });
});
