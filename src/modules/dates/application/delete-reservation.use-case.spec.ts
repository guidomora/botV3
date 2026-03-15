import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';

describe('DeleteReservationUseCase', () => {
  let useCase: DeleteReservationUseCase;

  const googleSheetsServiceMock = {
    getDateIndexByData: jest.fn(),
    getDatetimeDates: jest.fn(),
    deleteReservation: jest.fn(),
    deleteRow: jest.fn(),
    getAvailabilityFromReservations: jest.fn(),
    updateAvailabilityFromReservations: jest.fn(),
    refreshAvailabilityForDate: jest.fn(),
    getDateIndexByDate: jest.fn(),
    deleteOldRows: jest.fn(),
  };

  const generateDatetimeMock = {
    createPastDay: jest.fn(),
  };

  const deleteReservationData = {
    date: 'viernes 27 de febrero 2030 27/02/2030',
    time: '22:00',
    name: 'guido',
    phone: '54-9-1154916243',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteReservationUseCase(
      googleSheetsServiceMock as unknown as GoogleSheetsService,
      generateDatetimeMock as unknown as GenerateDatetime,
    );
  });

  it('should clear reservation cells when there is only one row for the slot', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.getDatetimeDates.mockResolvedValue([
      ['viernes 27 de febrero 2030 27/02/2030', '22:00', 'guido', '54-9-1154916243', 'Cena', '4'],
    ]);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      reservations: 0,
      available: 42,
    });

    await expect(useCase.deleteReservation(deleteReservationData)).resolves.toBe(
      'Su reserva ha sido cancelada correctamente.',
    );

    expect(googleSheetsServiceMock.deleteReservation).toHaveBeenCalledWith('Reservas!C27:F27');
    expect(googleSheetsServiceMock.refreshAvailabilityForDate).toHaveBeenCalledWith(
      'viernes 27 de febrero 2030 27/02/2030',
    );
  });

  it('should delete the full row when there are duplicated rows for the same slot', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(27);
    googleSheetsServiceMock.getDatetimeDates.mockResolvedValue([
      ['viernes 27 de febrero 2030 27/02/2030', '22:00', 'guido', '54-9-1154916243', 'Cena', '4'],
      ['viernes 27 de febrero 2030 27/02/2030', '22:00', 'ana', '54-9-1199999999', 'Cena', '2'],
    ]);
    googleSheetsServiceMock.getAvailabilityFromReservations.mockResolvedValue({
      reservations: 2,
      available: 40,
    });

    await useCase.deleteReservation(deleteReservationData);

    expect(googleSheetsServiceMock.deleteRow).toHaveBeenCalledWith(27, 0);
    expect(googleSheetsServiceMock.deleteReservation).not.toHaveBeenCalled();
  });

  it('should return a friendly message when reservation cannot be found', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockResolvedValue(-1);

    await expect(useCase.deleteReservation(deleteReservationData)).resolves.toBe(
      'Algunos de los datos ingresados no coinciden con la reserva.',
    );
  });

  it('should rethrow unexpected errors while deleting reservation', async () => {
    googleSheetsServiceMock.getDateIndexByData.mockRejectedValue(new Error('lookup-failed'));

    await expect(useCase.deleteReservation(deleteReservationData)).rejects.toThrow('lookup-failed');
  });

  it('should delete old rows in both sheets when cutoff date exists', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('martes 10 de marzo 2030 10/03/2030');
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValueOnce(12).mockResolvedValueOnce(20);

    await expect(useCase.deleteOldRows()).resolves.toBeUndefined();

    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenNthCalledWith(1, 4, 12, 0);
    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenNthCalledWith(2, 4, 20, 1);
  });

  it('should stop when first sheet cutoff date is not found', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('martes 10 de marzo 2030 10/03/2030');
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValue(-1);

    await expect(useCase.deleteOldRows()).resolves.toBe('No se encontro la fecha');

    expect(googleSheetsServiceMock.deleteOldRows).not.toHaveBeenCalled();
  });

  it('should stop when second sheet cutoff date is not found', async () => {
    generateDatetimeMock.createPastDay.mockReturnValue('martes 10 de marzo 2030 10/03/2030');
    googleSheetsServiceMock.getDateIndexByDate.mockResolvedValueOnce(12).mockResolvedValueOnce(-1);

    await expect(useCase.deleteOldRows()).resolves.toBe('No se encontro la fecha');

    expect(googleSheetsServiceMock.deleteOldRows).toHaveBeenCalledTimes(1);
  });
});
