import { ServiceResponse, StatusEnum } from 'src/lib';

const DUPLICATE_SAME_DAY_RESERVATION_MESSAGE =
  'Ya existe una reserva asociada a este numero para el dia solicitado. Si queres, puedo ayudarte a modificar la reserva existente.';

export const getDuplicateSameDayReservationResponse = (): ServiceResponse => ({
  error: true,
  message: DUPLICATE_SAME_DAY_RESERVATION_MESSAGE,
  status: StatusEnum.DUPLICATE_RESERVATION_SAME_DAY,
});
