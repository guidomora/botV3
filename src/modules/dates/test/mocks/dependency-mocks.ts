export const createDayUseCaseMock = () => ({
  createDate: jest.fn(),
  createNextDate: jest.fn(),
  createXDates: jest.fn(),
});

export const createReservationRowUseCaseMock = () => ({
  createReservation: jest.fn(),
});

export const deleteReservationUseCaseMock = () => ({
  deleteReservation: jest.fn(),
  deleteOldRows: jest.fn(),
});

export const generateDatetimeMock = () => ({
  createDateTime: jest.fn(),
  createOneDayWithBookings: jest.fn(),
  createNextDay: jest.fn(),
  createPastDay: jest.fn(),
});

export const googleSheetsServiceMock = () => ({
  appendRow: jest.fn(),
  getLastRowValue: jest.fn(),
  getDate: jest.fn(),
  hasReservationByDateAndPhone: jest.fn(),
  getAvailabilityFromReservations: jest.fn(),
  getRowValues: jest.fn(),
  createReservation: jest.fn(),
  updateAvailabilityFromReservations: jest.fn(),
  refreshAvailabilityForDate: jest.fn(),
  insertRow: jest.fn(),
  deleteRow: jest.fn(),
  getDayAvailability: jest.fn(),
  getDateIndexByData: jest.fn(),
  getDatetimeDates: jest.fn(),
  deleteReservation: jest.fn(),
  getDateIndexByDate: jest.fn(),
  deleteOldRows: jest.fn(),
});

export const googleTemporalSheetsServiceMock = () => ({
  addMissingField: jest.fn(),
  findTemporalRowIndexByWaId: jest.fn(),
});
