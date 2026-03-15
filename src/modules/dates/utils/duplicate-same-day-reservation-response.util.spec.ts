import { StatusEnum } from 'src/lib';
import { getDuplicateSameDayReservationResponse } from './duplicate-same-day-reservation-response.util';

describe('getDuplicateSameDayReservationResponse', () => {
  it('should return duplicate same day reservation response', () => {
    expect(getDuplicateSameDayReservationResponse()).toEqual({
      error: true,
      message:
        'Ya existe una reserva asociada a este numero para el dia solicitado. Si queres, puedo ayudarte a modificar la reserva existente.',
      status: StatusEnum.DUPLICATE_RESERVATION_SAME_DAY,
    });
  });
});
