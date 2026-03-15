export const futureReservationDateLabelMock = 'domingo 01 de marzo 2030 01/03/2030';
export const nextReservationDateLabelMock = 'lunes 02 de marzo 2030 02/03/2030';
export const existingReservationDateLabelMock = 'viernes 27 de febrero 2030 27/02/2030';

export const availabilityRowsMock = [
  [futureReservationDateLabelMock, '16:00', '0', '42'],
  [futureReservationDateLabelMock, '17:00', '0', '40'],
  [futureReservationDateLabelMock, '18:00', '0', '39'],
];

export const minimalSlotRowValuesMock = [[existingReservationDateLabelMock], ['22:00']];

export const occupiedSlotRowValuesMock = [
  [existingReservationDateLabelMock],
  ['22:00'],
  ['guido'],
  ['54-9-1154916243'],
  ['Cena'],
  [4],
];

export const updateCurrentRowValuesMock = [
  [futureReservationDateLabelMock],
  ['20:00'],
  ['guido'],
  ['54-9-1154916243'],
  ['Cena'],
  ['4'],
];

export const singleReservationSheetRowMock = [
  [existingReservationDateLabelMock, '22:00', 'guido', '54-9-1154916243', 'Cena', '4'],
];

export const duplicatedReservationSheetRowsMock = [
  [existingReservationDateLabelMock, '22:00', 'guido', '54-9-1154916243', 'Cena', '4'],
  [existingReservationDateLabelMock, '22:00', 'ana', '54-9-1199999999', 'Cena', '2'],
];

export const createDayRowsMock = [
  ['', ''],
  ['', ''],
  [futureReservationDateLabelMock, '12:00'],
  [futureReservationDateLabelMock, '13:00'],
];

export const createDayAvailabilityRowsMock = [
  ['', ''],
  ['', ''],
  [futureReservationDateLabelMock, '12:00', '0', '42'],
  [futureReservationDateLabelMock, '13:00', '0', '42'],
];
