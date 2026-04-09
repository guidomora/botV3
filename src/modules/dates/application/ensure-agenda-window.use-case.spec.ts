import { CreateDayUseCase } from './create-day.use-case';
import { EnsureAgendaWindowUseCase } from './ensure-agenda-window.use-case';
import { DatesSheetPort } from 'src/lib';
import {
  createDayUseCaseMock as buildCreateDayUseCaseMock,
  googleSheetsServiceMock as buildGoogleSheetsServiceMock,
} from '../test/mocks/dependency-mocks';

describe('EnsureAgendaWindowUseCase', () => {
  let useCase: EnsureAgendaWindowUseCase;

  const createDayUseCaseMock = buildCreateDayUseCaseMock();
  const googleSheetsServiceMock = buildGoogleSheetsServiceMock();

  beforeEach(() => {
    Object.values(createDayUseCaseMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(googleSheetsServiceMock).forEach((mockFn) => mockFn.mockReset());

    process.env.AGENDA_DAYS_AHEAD = '15';
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-16T12:00:00-03:00'));

    useCase = new EnsureAgendaWindowUseCase(
      createDayUseCaseMock as unknown as CreateDayUseCase,
      googleSheetsServiceMock as unknown as DatesSheetPort,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.AGENDA_DAYS_AHEAD;
  });

  it('should do nothing when availability already covers the target window', async () => {
    googleSheetsServiceMock.getLastRowValue.mockResolvedValue('lunes 30 de marzo 2026 30/03/2026');

    await expect(useCase.ensureAgendaWindow()).resolves.toEqual({
      targetDaysAhead: 15,
      currentCoverageDays: 15,
      missingDays: 0,
      createdDays: 0,
      lastRegisteredDate: 'lunes 30 de marzo 2026 30/03/2026',
      message: 'La agenda ya cubre 15 dias. No se agregaron nuevas fechas.',
    });

    expect(createDayUseCaseMock.createXDates).not.toHaveBeenCalled();
    expect(createDayUseCaseMock.createXDatesFrom).not.toHaveBeenCalled();
  });

  it('should create only the missing days when coverage is short by one day', async () => {
    googleSheetsServiceMock.getLastRowValue.mockResolvedValue(
      'domingo 29 de marzo 2026 29/03/2026',
    );
    createDayUseCaseMock.createXDates.mockResolvedValue('Se agregaron 1 dias');

    await expect(useCase.ensureAgendaWindow()).resolves.toEqual({
      targetDaysAhead: 15,
      currentCoverageDays: 14,
      missingDays: 1,
      createdDays: 1,
      lastRegisteredDate: 'domingo 29 de marzo 2026 29/03/2026',
      message: 'Se agregaron 1 dias para completar 15 dias de agenda.',
    });

    expect(createDayUseCaseMock.createXDates).toHaveBeenCalledWith(1);
  });

  it('should create all target days from today when the sheet is empty', async () => {
    googleSheetsServiceMock.getLastRowValue.mockResolvedValue('no hay valores');
    createDayUseCaseMock.createXDatesFrom.mockResolvedValue('Se agregaron 15 dias');

    const result = await useCase.ensureAgendaWindow();

    expect(result).toMatchObject({
      targetDaysAhead: 15,
      currentCoverageDays: 0,
      missingDays: 15,
      createdDays: 15,
      lastRegisteredDate: null,
    });
    expect(createDayUseCaseMock.createXDatesFrom).toHaveBeenCalledTimes(1);
    expect(createDayUseCaseMock.createXDatesFrom).toHaveBeenCalledWith(expect.any(Date), 15);
  });

  it('should recreate the full target window from today when last registered day is in the past', async () => {
    googleSheetsServiceMock.getLastRowValue.mockResolvedValue(
      'domingo 15 de marzo 2026 15/03/2026',
    );
    createDayUseCaseMock.createXDatesFrom.mockResolvedValue('Se agregaron 15 dias');

    await expect(useCase.ensureAgendaWindow()).resolves.toEqual({
      targetDaysAhead: 15,
      currentCoverageDays: 0,
      missingDays: 15,
      createdDays: 15,
      lastRegisteredDate: 'domingo 15 de marzo 2026 15/03/2026',
      message: 'Se agregaron 15 dias para completar 15 dias de agenda.',
    });

    expect(createDayUseCaseMock.createXDatesFrom).toHaveBeenCalledTimes(1);
    expect(createDayUseCaseMock.createXDates).not.toHaveBeenCalled();
  });

  it('should throw when target env is invalid', async () => {
    process.env.AGENDA_DAYS_AHEAD = '0';

    await expect(useCase.ensureAgendaWindow()).rejects.toThrow(
      'La variable de entorno AGENDA_DAYS_AHEAD debe ser un numero entero mayor a 0.',
    );
  });
});
