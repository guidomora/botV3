export const createDayUseCaseMock = () => ({
  createDate: jest.fn(),
  createNextDate: jest.fn(),
  createXDates: jest.fn(),
  createXDatesFrom: jest.fn(),
});

export const createReservationRowUseCaseMock = () => ({
  createReservation: jest.fn(),
});

export const deleteReservationUseCaseMock = () => ({
  deleteReservation: jest.fn(),
  deleteOldRows: jest.fn(),
});

export const ensureAgendaWindowUseCaseMock = () => ({
  ensureAgendaWindow: jest.fn(),
});

export const updateReservationUseCaseMock = () => ({
  updateReservation: jest.fn(),
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
  getFirstRowValue: jest.fn(),
  getDate: jest.fn(),
  hasReservationByDateAndPhone: jest.fn(),
  getAvailabilityFromReservations: jest.fn(),
  isDayClosed: jest.fn(),
  getRowValues: jest.fn(),
  createReservation: jest.fn(),
  updateAvailabilityFromReservations: jest.fn(),
  refreshAvailabilityForDate: jest.fn(),
  insertRow: jest.fn(),
  deleteRow: jest.fn(),
  getDayAvailability: jest.fn(),
  getDateIndexByData: jest.fn(),
  getDatetimeDates: jest.fn(),
  getReservationsByDate: jest.fn(),
  getAvailabilitySlotsByDate: jest.fn(),
  deleteReservation: jest.fn(),
  getDateIndexByDate: jest.fn(),
  deleteOldRows: jest.fn(),
  deleteClosedDaysBefore: jest.fn(),
  deleteClosedSlotsBefore: jest.fn(),
  closeDay: jest.fn(),
  openDay: jest.fn(),
});

export const googleTemporalSheetsServiceMock = () => ({
  addMissingField: jest.fn(),
  findTemporalRowIndexByWaId: jest.fn(),
  findExpiredRows: jest.fn(),
  clearFields: jest.fn(),
});
