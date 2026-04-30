import { createGoogleSheetsRepositoryMock } from '../test/mocks/google-repository.mock';
import { GoogleSheetsClosedScheduleService } from './google-sheets-closed-schedule.service';

describe('Given GoogleSheetsClosedScheduleService', () => {
  let repository = createGoogleSheetsRepositoryMock();
  let service: GoogleSheetsClosedScheduleService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createGoogleSheetsRepositoryMock();
    service = new GoogleSheetsClosedScheduleService(repository);
  });

  it('Should return true when the requested day is closed', async () => {
    repository.getDates.mockResolvedValue([
      ['date', 'reason', 'createdAt'],
      ['2026-04-10', 'Mantenimiento', '2026-04-01T10:00:00.000Z'],
    ]);

    await expect(service.isDayClosed('viernes 10 de abril 2026 10/04/2026')).resolves.toBe(true);
  });

  it('Should close a slot by consolidating existing ranges for the same date', async () => {
    repository.getDates.mockResolvedValueOnce([
      ['2026-04-10', '12:00', '14:00', 'Primer motivo', '2026-04-01T10:00:00.000Z'],
      ['2026-04-10', '14:00', '15:00', 'Segundo motivo', '2026-04-01T11:00:00.000Z'],
    ]);

    await expect(
      service.closeSlot({
        date: '2026-04-10',
        fromTime: '13:00',
        toTime: '16:00',
        reason: 'Ultimo motivo',
      }),
    ).resolves.toEqual({
      fromTime: '12:00',
      toTime: '16:00',
      reason: 'Ultimo motivo',
    });

    expect(repository.deleteRow.mock.calls).toEqual([
      [2, 4],
      [1, 4],
    ]);
    expect(repository.appendRow.mock.calls[0][0]).toBe('ClosedSlots!A:E');
  });

  it('Should reopen a closed slot by preserving remaining closed ranges', async () => {
    repository.getDates.mockResolvedValueOnce([
      ['2026-04-10', '10:00', '14:00', 'Evento privado', '2026-04-01T10:00:00.000Z'],
    ]);

    await expect(
      service.openSlot({
        date: '2026-04-10',
        fromTime: '11:00',
        toTime: '12:00',
      }),
    ).resolves.toBe(1);

    expect(repository.appendRow.mock.calls[0][1]).toEqual([
      ['2026-04-10', '10:00', '11:00', 'Evento privado', '2026-04-01T10:00:00.000Z'],
      ['2026-04-10', '12:00', '14:00', 'Evento privado', '2026-04-01T10:00:00.000Z'],
    ]);
  });
});
