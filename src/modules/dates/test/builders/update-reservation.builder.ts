import { UpdateReservationType } from 'src/lib/types/reservation/update-reservation.type';

export const buildUpdateReservationMock = (
  overrides: Partial<UpdateReservationType> = {},
): UpdateReservationType => ({
  currentName: 'guido',
  phone: '1154916243',
  currentDate: 'domingo 01 de marzo 2030 01/03/2030',
  currentTime: '20:00',
  currentQuantity: '4',
  newDate: null,
  newTime: null,
  newName: null,
  newQuantity: null,
  stage: 'reschedule',
  ...overrides,
});
