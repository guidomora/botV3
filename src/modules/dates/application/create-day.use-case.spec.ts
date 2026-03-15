import { CreateDayUseCase } from './create-day.use-case';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import {
  createDayAvailabilityRowsMock,
  createDayRowsMock,
  futureReservationDateLabelMock,
  nextReservationDateLabelMock,
} from '../test/mocks/sheets-data.mock';
import {
  generateDatetimeMock as buildGenerateDatetimeMock,
  googleSheetsServiceMock as buildGoogleSheetsServiceMock,
} from '../test/mocks/dependency-mocks';

describe('CreateDayUseCase', () => {
  let useCase: CreateDayUseCase;

  const generateDatetimeMock = buildGenerateDatetimeMock();
  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();

  beforeEach(() => {
    Object.values(generateDatetimeMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());

    useCase = new CreateDayUseCase(
      generateDatetimeMock as unknown as GenerateDatetime,
      googleSheetsServiceMock as unknown as GoogleSheetsService,
    );
  });

  it('should create the current date in both sheets', async () => {
    generateDatetimeMock.createDateTime.mockReturnValue(createDayRowsMock);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(createDayAvailabilityRowsMock);

    await expect(useCase.createDate()).resolves.toBe(
      `Se agrego el dia ${futureReservationDateLabelMock}`,
    );

    expect(googleSheetsServiceMock.appendRow).toHaveBeenNthCalledWith(
      1,
      'Reservas!A:C',
      createDayRowsMock,
    );
    expect(googleSheetsServiceMock.appendRow).toHaveBeenNthCalledWith(
      2,
      'ReservasDisponibles!A:E',
      createDayAvailabilityRowsMock,
    );
  });

  it('should rethrow when append fails while creating current date', async () => {
    generateDatetimeMock.createDateTime.mockReturnValue(createDayRowsMock);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(createDayAvailabilityRowsMock);
    googleSheetsServiceMock.appendRow.mockRejectedValue(new Error('append-failed'));

    await expect(useCase.createDate()).rejects.toThrow('append-failed');
  });

  it('should create the next date based on the last sheet row', async () => {
    googleSheetsServiceMock.getLastRowValue.mockResolvedValue(futureReservationDateLabelMock);
    generateDatetimeMock.createNextDay.mockReturnValue(nextReservationDateLabelMock);
    generateDatetimeMock.createDateTime.mockReturnValue(createDayRowsMock);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(createDayAvailabilityRowsMock);

    await expect(useCase.createNextDate()).resolves.toBe(
      `Se agrego el dia ${futureReservationDateLabelMock}`,
    );

    expect(generateDatetimeMock.createNextDay).toHaveBeenCalled();
    expect(generateDatetimeMock.createDateTime).toHaveBeenCalledWith(nextReservationDateLabelMock);
    expect(generateDatetimeMock.createOneDayWithBookings).toHaveBeenCalledWith(
      nextReservationDateLabelMock,
    );
  });

  it('should create multiple consecutive dates', async () => {
    googleSheetsServiceMock.getLastRowValue
      .mockResolvedValueOnce(futureReservationDateLabelMock)
      .mockResolvedValueOnce(nextReservationDateLabelMock);
    generateDatetimeMock.createNextDay
      .mockReturnValueOnce(nextReservationDateLabelMock)
      .mockReturnValueOnce('martes 03 de marzo 2030 03/03/2030');
    generateDatetimeMock.createDateTime.mockReturnValue(createDayRowsMock);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(createDayAvailabilityRowsMock);

    await expect(useCase.createXDates(2)).resolves.toBe('Se agregaron 2 dias');

    expect(googleSheetsServiceMock.appendRow).toHaveBeenCalledTimes(4);
  });

  it('should rethrow when reading last row fails in createXDates', async () => {
    googleSheetsServiceMock.getLastRowValue.mockRejectedValue(new Error('last-row-failed'));

    await expect(useCase.createXDates(1)).rejects.toThrow('last-row-failed');
  });

  it('should expose generateDatetime helper wrappers', () => {
    generateDatetimeMock.createDateTime.mockReturnValue(createDayRowsMock);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(createDayAvailabilityRowsMock);
    generateDatetimeMock.createNextDay.mockReturnValue(nextReservationDateLabelMock);

    expect(useCase.createDateTime(futureReservationDateLabelMock)).toBe(createDayRowsMock);
    expect(useCase.createOneDayWithBookings(futureReservationDateLabelMock)).toBe(
      createDayAvailabilityRowsMock,
    );
    expect(useCase.createNextDay(new Date(2030, 2, 1))).toBe(nextReservationDateLabelMock);
  });
});
