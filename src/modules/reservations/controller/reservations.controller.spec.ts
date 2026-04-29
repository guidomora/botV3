import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsDashboardService } from '../service/reservations-dashboard.service';
import { InternalApiTokenGuard } from '../guards/internal-api-token.guard';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  const reservationsDashboardServiceMock = {
    createReservation: jest.fn(),
    getAvailableDates: jest.fn(),
    getDailySlots: jest.fn(),
    getDailySummary: jest.fn(),
    deleteReservation: jest.fn(),
    updateReservation: jest.fn(),
    closeDay: jest.fn(),
    closeSlot: jest.fn(),
    openDay: jest.fn(),
    openSlot: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleBuilder = Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsDashboardService,
          useValue: reservationsDashboardServiceMock,
        },
      ],
    });

    moduleBuilder
      .overrideGuard(InternalApiTokenGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(ReservationsController);
  });

  it('should delegate daily summary request using formatted sheet date', async () => {
    reservationsDashboardServiceMock.getDailySummary.mockResolvedValue({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });

    await expect(controller.getDailySummary({ date: '2026-04-10' })).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });

    expect(reservationsDashboardServiceMock.getDailySummary).toHaveBeenCalledWith(
      '2026-04-10',
      '10/04/2026',
    );
  });

  it('should return available reservation dates for dashboard calendar', async () => {
    reservationsDashboardServiceMock.getAvailableDates.mockResolvedValue([
      { date: '2026-04-01', isClosed: false },
      { date: '2026-04-02', isClosed: true },
      { date: '2026-04-03', isClosed: false },
    ]);

    await expect(controller.getAvailableDates()).resolves.toEqual({
      dates: [
        { date: '2026-04-01', isClosed: false },
        { date: '2026-04-02', isClosed: true },
        { date: '2026-04-03', isClosed: false },
      ],
    });

    expect(reservationsDashboardServiceMock.getAvailableDates).toHaveBeenCalledTimes(1);
  });

  it('should delegate daily slots request using formatted sheet date', async () => {
    reservationsDashboardServiceMock.getDailySlots.mockResolvedValue({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      slots: [
        { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
        { time: '21:00', reserved: 18, available: 24, isClosed: false, reason: null },
      ],
    });

    await expect(controller.getDailySlots({ date: '2026-04-10' })).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      slots: [
        { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
        { time: '21:00', reserved: 18, available: 24, isClosed: false, reason: null },
      ],
    });

    expect(reservationsDashboardServiceMock.getDailySlots).toHaveBeenCalledWith(
      '2026-04-10',
      '10/04/2026',
    );
  });

  it('should delegate reservation update request to dashboard service', async () => {
    reservationsDashboardServiceMock.updateReservation.mockResolvedValue({
      message: 'Reserva actualizada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '21:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    });

    const body = {
      phone: '1122334455',
      currentDate: '2026-04-10',
      currentTime: '20:00',
      time: '21:00',
      quantity: 4,
    };

    await expect(controller.updateReservation(body)).resolves.toEqual({
      message: 'Reserva actualizada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '21:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    });

    expect(reservationsDashboardServiceMock.updateReservation).toHaveBeenCalledWith(body);
  });

  it('should delegate reservation create request to dashboard service', async () => {
    reservationsDashboardServiceMock.createReservation.mockResolvedValue({
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

    const body = {
      date: '2026-04-16',
      time: '21:00',
      name: 'Juan Perez',
      phone: '1122334455',
      quantity: 14,
    };

    await expect(controller.createReservation(body)).resolves.toEqual({
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

    expect(reservationsDashboardServiceMock.createReservation).toHaveBeenCalledWith(body);
  });

  it('should delegate reservation delete request to dashboard service', async () => {
    reservationsDashboardServiceMock.deleteReservation.mockResolvedValue({
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

    const body = {
      phone: '1122334455',
      currentDate: '2026-04-10',
      currentTime: '20:00',
    };

    await expect(controller.deleteReservation(body)).resolves.toEqual({
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

    expect(reservationsDashboardServiceMock.deleteReservation).toHaveBeenCalledWith(body);
  });

  it('should delegate close day request to dashboard service', async () => {
    reservationsDashboardServiceMock.closeDay.mockResolvedValue({
      date: '2026-04-16',
      isClosed: true,
      reason: 'Cerrado por mantenimiento',
      existingReservationsCount: 1,
      warning:
        'La fecha fue cerrada, pero todavia existen 1 reservas activas que deberan ser gestionadas manualmente.',
    });

    await expect(
      controller.closeDay(
        { date: '2026-04-16' },
        {
          reason: 'Cerrado por mantenimiento',
        },
      ),
    ).resolves.toEqual({
      date: '2026-04-16',
      isClosed: true,
      reason: 'Cerrado por mantenimiento',
      existingReservationsCount: 1,
      warning:
        'La fecha fue cerrada, pero todavia existen 1 reservas activas que deberan ser gestionadas manualmente.',
    });
  });

  it('should delegate close slot request to dashboard service', async () => {
    reservationsDashboardServiceMock.closeSlot.mockResolvedValue({
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
      controller.closeSlot(
        { date: '2026-04-16' },
        {
          fromTime: '13:00',
          toTime: '15:00',
          reason: 'Evento privado',
        },
      ),
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

  it('should delegate open day request to dashboard service', async () => {
    reservationsDashboardServiceMock.openDay.mockResolvedValue({
      date: '2026-04-16',
      isClosed: false,
    });

    await expect(controller.openDay({ date: '2026-04-16' })).resolves.toEqual({
      date: '2026-04-16',
      isClosed: false,
    });
  });

  it('should delegate open slot request to dashboard service', async () => {
    reservationsDashboardServiceMock.openSlot.mockResolvedValue({
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '14:00',
      isClosed: false,
      reopenedSlotsCount: 1,
    });

    await expect(
      controller.openSlot(
        { date: '2026-04-16' },
        {
          fromTime: '13:00',
          toTime: '14:00',
        },
      ),
    ).resolves.toEqual({
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '14:00',
      isClosed: false,
      reopenedSlotsCount: 1,
    });

    expect(reservationsDashboardServiceMock.openSlot).toHaveBeenCalledWith({
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '14:00',
    });
  });
});
