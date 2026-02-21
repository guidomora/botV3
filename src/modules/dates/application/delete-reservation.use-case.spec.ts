import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { DeleteReservationUseCase } from './delete-reservation.use-case';
import { DeleteReservation, ReservationOperation } from 'src/lib';
import { SHEETS_NAMES } from 'src/constants';
import { deleteReservationMock } from '../test/mocks/reservation.mock';
import { Availability } from 'src/lib/types/availability/availability.type';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';

describe('GIVEN DeleteReservationUseCase', () => {
  let deleteReservationUseCase: DeleteReservationUseCase;
  let loggerErrorSpy: jest.SpyInstance;

  const getDateIndexByDataMock = jest.fn();
  const getDatetimeDatesMock = jest.fn();
  const deleteReservationMockFn = jest.fn();
  const deleteRowMock = jest.fn();
  const getAvailabilityMock = jest.fn();
  const updateAvailabilityMock = jest.fn();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeleteReservationUseCase,
        {
          provide: GoogleSheetsService,
          useValue: {
            getDateIndexByData: getDateIndexByDataMock,
            getDatetimeDates: getDatetimeDatesMock,
            deleteReservation: deleteReservationMockFn,
            deleteRow: deleteRowMock,
            getAvailability: getAvailabilityMock,
            updateAvailability: updateAvailabilityMock,
          },
        },
        {
          provide: GenerateDatetime,
          useValue: {
            createPastDay: jest.fn(),
          },
        },
      ],
    }).compile();

    deleteReservationUseCase = module.get<DeleteReservationUseCase>(DeleteReservationUseCase);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('SHOULD be defined', () => {
    expect(deleteReservationUseCase).toBeDefined();
  });

  describe('WHEN deleteReservation is called', () => {
    const reservation: DeleteReservation = deleteReservationMock;

    it('SHOULD return a message if the date is not found', async () => {
      getDateIndexByDataMock.mockResolvedValue(-1);

      const result = await deleteReservationUseCase.deleteReservation(reservation);

      expect(result).toBe('No se encontro la fecha');
    });

    it('SHOULD delete the reservation when there is only one date', async () => {
      const index = 3;
      const availability: Availability = {
        isAvailable: true,
        reservations: 1,
        available: 19,
      };
      getDateIndexByDataMock.mockResolvedValue(index);
      getDatetimeDatesMock.mockResolvedValue(['date']);
      getAvailabilityMock.mockResolvedValue(availability);

      const result = await deleteReservationUseCase.deleteReservation(reservation);

      expect(deleteReservationMockFn).toHaveBeenCalledWith(
        `${SHEETS_NAMES[0]}!C${index}:F${index}`,
      );
      expect(updateAvailabilityMock).toHaveBeenCalledWith(ReservationOperation.SUBTRACT, {
        reservations: availability.reservations,
        available: availability.available,
        date: reservation.date!,
        time: reservation.time!,
      });
      expect(result).toBe('Reserva eliminada correctamente');
    });

    it('SHOULD delete the row when there are multiple dates', async () => {
      const index = 5;
      const availability: Availability = {
        isAvailable: true,
        reservations: 1,
        available: 19,
      };
      getDateIndexByDataMock.mockResolvedValue(index);
      getDatetimeDatesMock.mockResolvedValue(['date1', 'date2']);
      getAvailabilityMock.mockResolvedValue(availability);

      const result = await deleteReservationUseCase.deleteReservation(reservation);

      expect(deleteRowMock).toHaveBeenCalledWith(index, 0);
      expect(updateAvailabilityMock).toHaveBeenCalledWith(ReservationOperation.SUBTRACT, {
        reservations: availability.reservations,
        available: availability.available,
        date: reservation.date!,
        time: reservation.time!,
      });
      expect(result).toBe('Reserva eliminada correctamente');
    });

    it('SHOULD throw an error and log it', async () => {
      const errorMock = new Error('delete failed');
      getDateIndexByDataMock.mockRejectedValue(errorMock);

      await expect(deleteReservationUseCase.deleteReservation(reservation)).rejects.toThrow(
        'delete failed',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error al eliminar la reserva', errorMock);
    });
  });
});
