import { CreateDayUseCase } from './create-day.use-case';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';

describe('CreateDayUseCase', () => {
  let useCase: CreateDayUseCase;

  const generateDatetimeMock = {
    createDateTime: jest.fn(),
    createOneDayWithBookings: jest.fn(),
    createNextDay: jest.fn(),
  };

  const googleSheetsServiceMock = {
    appendRow: jest.fn(),
    getLastRowValue: jest.fn(),
  };

  const dateRows = [
    ['', ''],
    ['', ''],
    ['domingo 01 de marzo 2030 01/03/2030', '12:00'],
    ['domingo 01 de marzo 2030 01/03/2030', '13:00'],
  ];

  const availabilityRows = [
    ['', ''],
    ['', ''],
    ['domingo 01 de marzo 2030 01/03/2030', '12:00', '0', '42'],
    ['domingo 01 de marzo 2030 01/03/2030', '13:00', '0', '42'],
  ];

  beforeEach(() => {
    Object.values(generateDatetimeMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());

    useCase = new CreateDayUseCase(
      generateDatetimeMock as unknown as GenerateDatetime,
      googleSheetsServiceMock as unknown as GoogleSheetsService,
    );
  });

  it('should create the current date in both sheets', async () => {
    generateDatetimeMock.createDateTime.mockReturnValue(dateRows);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(availabilityRows);

    await expect(useCase.createDate()).resolves.toBe(
      'Se agrego el dia domingo 01 de marzo 2030 01/03/2030',
    );

    expect(googleSheetsServiceMock.appendRow).toHaveBeenNthCalledWith(1, 'Reservas!A:C', dateRows);
    expect(googleSheetsServiceMock.appendRow).toHaveBeenNthCalledWith(
      2,
      'ReservasDisponibles!A:E',
      availabilityRows,
    );
  });

  it('should rethrow when append fails while creating current date', async () => {
    generateDatetimeMock.createDateTime.mockReturnValue(dateRows);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(availabilityRows);
    googleSheetsServiceMock.appendRow.mockRejectedValue(new Error('append-failed'));

    await expect(useCase.createDate()).rejects.toThrow('append-failed');
  });

  it('should create the next date based on the last sheet row', async () => {
    googleSheetsServiceMock.getLastRowValue.mockResolvedValue(
      'domingo 01 de marzo 2030 01/03/2030',
    );
    generateDatetimeMock.createNextDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');
    generateDatetimeMock.createDateTime.mockReturnValue(dateRows);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(availabilityRows);

    await expect(useCase.createNextDate()).resolves.toBe(
      'Se agrego el dia domingo 01 de marzo 2030 01/03/2030',
    );

    expect(generateDatetimeMock.createNextDay).toHaveBeenCalled();
    expect(generateDatetimeMock.createDateTime).toHaveBeenCalledWith(
      'lunes 02 de marzo 2030 02/03/2030',
    );
    expect(generateDatetimeMock.createOneDayWithBookings).toHaveBeenCalledWith(
      'lunes 02 de marzo 2030 02/03/2030',
    );
  });

  it('should create multiple consecutive dates', async () => {
    googleSheetsServiceMock.getLastRowValue
      .mockResolvedValueOnce('domingo 01 de marzo 2030 01/03/2030')
      .mockResolvedValueOnce('lunes 02 de marzo 2030 02/03/2030');
    generateDatetimeMock.createNextDay
      .mockReturnValueOnce('lunes 02 de marzo 2030 02/03/2030')
      .mockReturnValueOnce('martes 03 de marzo 2030 03/03/2030');
    generateDatetimeMock.createDateTime.mockReturnValue(dateRows);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(availabilityRows);

    await expect(useCase.createXDates(2)).resolves.toBe('Se agregaron 2 dias');

    expect(googleSheetsServiceMock.appendRow).toHaveBeenCalledTimes(4);
  });

  it('should rethrow when reading last row fails in createXDates', async () => {
    googleSheetsServiceMock.getLastRowValue.mockRejectedValue(new Error('last-row-failed'));

    await expect(useCase.createXDates(1)).rejects.toThrow('last-row-failed');
  });

  it('should expose generateDatetime helper wrappers', () => {
    generateDatetimeMock.createDateTime.mockReturnValue(dateRows);
    generateDatetimeMock.createOneDayWithBookings.mockReturnValue(availabilityRows);
    generateDatetimeMock.createNextDay.mockReturnValue('lunes 02 de marzo 2030 02/03/2030');

    expect(useCase.createDateTime('domingo 01 de marzo 2030 01/03/2030')).toBe(dateRows);
    expect(useCase.createOneDayWithBookings('domingo 01 de marzo 2030 01/03/2030')).toBe(
      availabilityRows,
    );
    expect(useCase.createNextDay(new Date(2030, 2, 1))).toBe('lunes 02 de marzo 2030 02/03/2030');
  });
});
