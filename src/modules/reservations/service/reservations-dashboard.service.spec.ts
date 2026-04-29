import { GetAvailableReservationDatesUseCase } from '../application/get-available-reservation-dates.use-case';
import { DailyReservationSlots, DailyReservationsSummary } from 'src/lib';
import { GetDailyReservationSlotsUseCase } from '../application/get-daily-reservation-slots.use-case';
import { GetDailyReservationsSummaryUseCase } from '../application/get-daily-reservations-summary.use-case';
import { DeleteDashboardReservationUseCase } from '../application/delete-dashboard-reservation.use-case';
import { ReservationsDashboardService } from './reservations-dashboard.service';
import { UpdateDashboardReservationUseCase } from '../application/update-dashboard-reservation.use-case';
import { CreateDashboardReservationUseCase } from '../application/create-dashboard-reservation.use-case';
import { CloseDashboardDayUseCase } from '../application/close-dashboard-day.use-case';
import { CloseDashboardSlotUseCase } from '../application/close-dashboard-slot.use-case';
import { OpenDashboardDayUseCase } from '../application/open-dashboard-day.use-case';
import { OpenDashboardSlotUseCase } from '../application/open-dashboard-slot.use-case';

describe('ReservationsDashboardService', () => {
  let service: ReservationsDashboardService;
  let createDashboardReservationUseCase: jest.Mocked<CreateDashboardReservationUseCase>;
  let getAvailableReservationDatesUseCase: jest.Mocked<GetAvailableReservationDatesUseCase>;
  let getDailyReservationSlotsUseCase: jest.Mocked<GetDailyReservationSlotsUseCase>;
  let getDailyReservationsSummaryUseCase: jest.Mocked<GetDailyReservationsSummaryUseCase>;
  let deleteDashboardReservationUseCase: jest.Mocked<DeleteDashboardReservationUseCase>;
  let updateDashboardReservationUseCase: jest.Mocked<UpdateDashboardReservationUseCase>;
  let closeDashboardDayUseCase: jest.Mocked<CloseDashboardDayUseCase>;
  let closeDashboardSlotUseCase: jest.Mocked<CloseDashboardSlotUseCase>;
  let openDashboardDayUseCase: jest.Mocked<OpenDashboardDayUseCase>;
  let openDashboardSlotUseCase: jest.Mocked<OpenDashboardSlotUseCase>;

  beforeEach(() => {
    getAvailableReservationDatesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAvailableReservationDatesUseCase>;

    getDailyReservationsSummaryUseCase = {
      execute: jest.fn<Promise<DailyReservationsSummary>, [string, string]>(),
    } as unknown as jest.Mocked<GetDailyReservationsSummaryUseCase>;

    getDailyReservationSlotsUseCase = {
      execute: jest.fn<Promise<DailyReservationSlots>, [string, string]>(),
    } as unknown as jest.Mocked<GetDailyReservationSlotsUseCase>;

    createDashboardReservationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateDashboardReservationUseCase>;

    updateDashboardReservationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateDashboardReservationUseCase>;

    deleteDashboardReservationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteDashboardReservationUseCase>;

    closeDashboardDayUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CloseDashboardDayUseCase>;

    closeDashboardSlotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CloseDashboardSlotUseCase>;

    openDashboardDayUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<OpenDashboardDayUseCase>;

    openDashboardSlotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<OpenDashboardSlotUseCase>;

    service = new ReservationsDashboardService(
      createDashboardReservationUseCase,
      getAvailableReservationDatesUseCase,
      getDailyReservationSlotsUseCase,
      getDailyReservationsSummaryUseCase,
      deleteDashboardReservationUseCase,
      updateDashboardReservationUseCase,
      closeDashboardDayUseCase,
      closeDashboardSlotUseCase,
      openDashboardDayUseCase,
      openDashboardSlotUseCase,
    );
  });

  it('should delegate available dates retrieval to the use case', async () => {
    getAvailableReservationDatesUseCase.execute.mockResolvedValue([
      { date: '2026-04-01', isClosed: false },
      { date: '2026-04-02', isClosed: true },
      { date: '2026-04-03', isClosed: false },
    ]);

    await expect(service.getAvailableDates()).resolves.toEqual([
      { date: '2026-04-01', isClosed: false },
      { date: '2026-04-02', isClosed: true },
      { date: '2026-04-03', isClosed: false },
    ]);
    expect(getAvailableReservationDatesUseCase.execute.mock.calls).toHaveLength(1);
  });

  it('should delegate reservation create to the use case', async () => {
    const payload = {
      date: '2026-04-16',
      time: '21:00',
      name: 'Juan Perez',
      phone: '1122334455',
      quantity: 14,
    };

    createDashboardReservationUseCase.execute.mockResolvedValue({
      message: 'Reserva creada correctamente.',
      reservation: {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 14,
      },
    });

    await expect(service.createReservation(payload)).resolves.toEqual({
      message: 'Reserva creada correctamente.',
      reservation: {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 14,
      },
    });

    expect(createDashboardReservationUseCase.execute.mock.calls[0]).toEqual([payload]);
  });

  it('should delegate summary retrieval to the use case', async () => {
    getDailyReservationsSummaryUseCase.execute.mockResolvedValue({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });

    await expect(service.getDailySummary('2026-04-10', '10/04/2026')).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });
    expect(getDailyReservationsSummaryUseCase.execute.mock.calls[0]).toEqual([
      '2026-04-10',
      '10/04/2026',
    ]);
  });

  it('should delegate slots retrieval to the use case', async () => {
    getDailyReservationSlotsUseCase.execute.mockResolvedValue({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      slots: [
        { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
        { time: '21:00', reserved: 18, available: 24, isClosed: true, reason: 'Evento privado' },
      ],
    });

    await expect(service.getDailySlots('2026-04-10', '10/04/2026')).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      slots: [
        { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
        { time: '21:00', reserved: 18, available: 24, isClosed: true, reason: 'Evento privado' },
      ],
    });
    expect(getDailyReservationSlotsUseCase.execute.mock.calls[0]).toEqual([
      '2026-04-10',
      '10/04/2026',
    ]);
  });

  it('should delegate reservation update to the use case', async () => {
    const payload = {
      phone: '1122334455',
      currentDate: '2026-04-10',
      currentTime: '20:00',
      quantity: 5,
    };

    updateDashboardReservationUseCase.execute.mockResolvedValue({
      message: 'Reserva actualizada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 5,
      },
    });

    await expect(service.updateReservation(payload)).resolves.toEqual({
      message: 'Reserva actualizada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 5,
      },
    });

    expect(updateDashboardReservationUseCase.execute.mock.calls[0]).toEqual([payload]);
  });

  it('should delegate reservation delete to the use case', async () => {
    const payload = {
      phone: '1122334455',
      currentDate: '2026-04-10',
      currentTime: '20:00',
    };

    deleteDashboardReservationUseCase.execute.mockResolvedValue({
      message: 'Reserva eliminada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    });

    await expect(service.deleteReservation(payload)).resolves.toEqual({
      message: 'Reserva eliminada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    });

    expect(deleteDashboardReservationUseCase.execute.mock.calls[0]).toEqual([payload]);
  });

  it('should delegate day close to the use case', async () => {
    closeDashboardDayUseCase.execute.mockResolvedValue({
      date: '2026-04-16',
      isClosed: true,
      reason: 'Cerrado por mantenimiento',
      existingReservationsCount: 2,
      warning:
        'La fecha fue cerrada, pero todavia existen 2 reservas activas que deberan ser gestionadas manualmente.',
    });

    await expect(
      service.closeDay({ date: '2026-04-16', reason: 'Cerrado por mantenimiento' }),
    ).resolves.toEqual({
      date: '2026-04-16',
      isClosed: true,
      reason: 'Cerrado por mantenimiento',
      existingReservationsCount: 2,
      warning:
        'La fecha fue cerrada, pero todavia existen 2 reservas activas que deberan ser gestionadas manualmente.',
    });
  });

  it('should delegate slot close to the use case', async () => {
    closeDashboardSlotUseCase.execute.mockResolvedValue({
      date: '2026-04-16',
      fromTime: '12:00',
      toTime: '15:00',
      isClosed: true,
      reason: 'Evento privado',
      existingReservationsCount: 1,
      warning:
        'La franja fue cerrada, pero todavia existen 1 reservas activas afectadas que deberan ser gestionadas manualmente.',
    });

    await expect(
      service.closeSlot({
        date: '2026-04-16',
        fromTime: '13:00',
        toTime: '15:00',
        reason: 'Evento privado',
      }),
    ).resolves.toEqual({
      date: '2026-04-16',
      fromTime: '12:00',
      toTime: '15:00',
      isClosed: true,
      reason: 'Evento privado',
      existingReservationsCount: 1,
      warning:
        'La franja fue cerrada, pero todavia existen 1 reservas activas afectadas que deberan ser gestionadas manualmente.',
    });
  });

  it('should delegate day reopen to the use case', async () => {
    openDashboardDayUseCase.execute.mockResolvedValue({
      date: '2026-04-16',
      isClosed: false,
    });

    await expect(service.openDay('2026-04-16')).resolves.toEqual({
      date: '2026-04-16',
      isClosed: false,
    });
  });

  it('should delegate slot reopen to the use case', async () => {
    openDashboardSlotUseCase.execute.mockResolvedValue({
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '14:00',
      isClosed: false,
      reopenedSlotsCount: 1,
    });

    const payload = {
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '14:00',
    };

    await expect(service.openSlot(payload)).resolves.toEqual({
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '14:00',
      isClosed: false,
      reopenedSlotsCount: 1,
    });

    expect(openDashboardSlotUseCase.execute.mock.calls[0]).toEqual([payload]);
  });
});
