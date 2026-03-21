import { Test, TestingModule } from '@nestjs/testing';
import { DatesController } from './dates.controller';
import { DatesService } from '../service/dates.service';
import { AgendaSyncGuard } from '../guards/agenda-sync.guard';

describe('DatesController', () => {
  let controller: DatesController;

  const datesServiceMock = {
    createDate: jest.fn(),
    createNextDate: jest.fn(),
    createXDates: jest.fn(),
    ensureAgendaWindow: jest.fn(),
    deleteOldRows: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleBuilder = Test.createTestingModule({
      controllers: [DatesController],
      providers: [
        {
          provide: DatesService,
          useValue: datesServiceMock,
        },
      ],
    });

    moduleBuilder
      .overrideGuard(AgendaSyncGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(DatesController);
  });

  it('should delegate create to service', async () => {
    datesServiceMock.createDate.mockResolvedValue('Se agrego el dia domingo 01 de marzo 2030');

    await expect(controller.create()).resolves.toBe('Se agrego el dia domingo 01 de marzo 2030');
    expect(datesServiceMock.createDate).toHaveBeenCalledTimes(1);
  });

  it('should delegate createNextDate to service', async () => {
    datesServiceMock.createNextDate.mockResolvedValue('Se agrego el dia lunes 02 de marzo 2030');

    await expect(controller.createNextDate()).resolves.toBe(
      'Se agrego el dia lunes 02 de marzo 2030',
    );
    expect(datesServiceMock.createNextDate).toHaveBeenCalledTimes(1);
  });

  it('should delegate createXDates with requested quantity', async () => {
    datesServiceMock.createXDates.mockResolvedValue('Se agregaron 3 dias');

    await expect(controller.createXDates(3)).resolves.toBe('Se agregaron 3 dias');
    expect(datesServiceMock.createXDates).toHaveBeenCalledWith(3);
  });

  it('should delegate ensureAgendaWindow to service', async () => {
    datesServiceMock.ensureAgendaWindow.mockResolvedValue({
      targetDaysAhead: 15,
      currentCoverageDays: 14,
      missingDays: 1,
      createdDays: 1,
      lastRegisteredDate: 'domingo 30 de marzo 2026 30/03/2026',
      message: 'Se agregaron 1 dias para completar 15 dias de agenda.',
    });

    await expect(controller.ensureAgendaWindow()).resolves.toEqual({
      targetDaysAhead: 15,
      currentCoverageDays: 14,
      missingDays: 1,
      createdDays: 1,
      lastRegisteredDate: 'domingo 30 de marzo 2026 30/03/2026',
      message: 'Se agregaron 1 dias para completar 15 dias de agenda.',
    });
    expect(datesServiceMock.ensureAgendaWindow).toHaveBeenCalledTimes(1);
  });

  it('should delegate deleteOldRows to service', async () => {
    datesServiceMock.deleteOldRows.mockResolvedValue('No se encontro la fecha');

    await expect(controller.deleteOldRows()).resolves.toBe('No se encontro la fecha');
    expect(datesServiceMock.deleteOldRows).toHaveBeenCalledTimes(1);
  });
});
