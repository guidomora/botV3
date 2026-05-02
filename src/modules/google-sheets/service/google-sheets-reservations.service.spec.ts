import { reservationPayloadMock, reservationRowsMock } from '../test/mocks/google-sheets-data.mock';
import { createGoogleSheetsRepositoryMock } from '../test/mocks/google-repository.mock';
import { GoogleSheetsReservationsService } from './google-sheets-reservations.service';

describe('Given GoogleSheetsReservationsService', () => {
  let repository = createGoogleSheetsRepositoryMock();
  let service: GoogleSheetsReservationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createGoogleSheetsRepositoryMock();
    service = new GoogleSheetsReservationsService(repository);
  });

  it('Should return index and row data for matching date and time', async () => {
    repository.getDates.mockResolvedValue(reservationRowsMock);

    await expect(
      service.getDate('martes 03 de marzo 2026 03/03/2026', '20:00', 'Reservas!A:C'),
    ).resolves.toBe(3);
    await expect(
      service.getDateData('martes 03 de marzo 2026 03/03/2026', '20:00', 'Reservas!A:C'),
    ).resolves.toEqual(reservationRowsMock[2]);
  });

  it('Should match reservation index by normalized name and phone formats', async () => {
    repository.getDates.mockResolvedValue([
      ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Servicio', 'Cantidad'],
      ['martes 03 de marzo 2026 03/03/2026', '20:00', 'maria lopez', '5491199988877', 'Cena', '4'],
    ]);

    await expect(
      service.getDateIndexByData({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        name: 'Maria',
        phone: '11 99988-877',
      }),
    ).resolves.toBe(2);
  });

  it('Should detect same-day reservations by phone while respecting excluded rows', async () => {
    repository.getDates.mockResolvedValue(reservationRowsMock);

    await expect(
      service.hasReservationByDateAndPhone('martes 03 de marzo 2026 03/03/2026', '1122334455'),
    ).resolves.toBe(true);
    await expect(
      service.hasReservationByDateAndPhone('martes 03 de marzo 2026 03/03/2026', '1122334455', 2),
    ).resolves.toBe(false);
  });

  it('Should map valid reservations for a date and locate one by time and phone', async () => {
    repository.getReservationsByDate.mockResolvedValue(reservationRowsMock);

    const reservations = await service.getReservationsByDate('martes 03 de marzo 2026 03/03/2026');

    expect(reservations).toEqual([
      {
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '19:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 2,
      },
      {
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        name: 'maria lopez',
        phone: '54-9-1199988877',
        service: 'Cena',
        quantity: 4,
      },
      {
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:30',
        name: 'otro',
        phone: '54-9-1100000000',
        service: 'Cena',
        quantity: 3,
      },
      {
        date: 'miercoles 04 de marzo 2026 04/03/2026',
        time: '19:00',
        name: 'ana',
        phone: '54-9-1177776666',
        service: 'Cena',
        quantity: 1,
      },
    ]);

    await expect(
      service.getReservationByDateTimeAndPhone('2026-03-03', '19:00', '11 2233-4455'),
    ).resolves.toEqual(reservations[0]);
  });

  it('Should delegate reservation writes and deletes to the repository', async () => {
    await service.createReservation('Reservas!A2:F2', reservationPayloadMock);
    await service.deleteReservation('Reservas!A5:D5');

    expect(repository.createReservation.mock.calls[0]).toEqual([
      'Reservas!A2:F2',
      reservationPayloadMock,
    ]);
    expect(repository.deleteReservation.mock.calls[0]).toEqual(['Reservas!A5:D5']);
  });
});
