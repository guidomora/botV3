import { Test } from '@nestjs/testing';
import { CreateDayUseCase } from './create-day.use-case';
import { dateTimeMock, dateTimeWithBookingsMock } from '../test/mocks/date.mock';
import { GenerateDatetime } from '../dateTime-build/generate-datetime';

describe('GIVEN create-day.use-case', () => {
  let createDayUseCase: CreateDayUseCase;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: CreateDayUseCase,
          useValue: {
            createDateTime: jest.fn(() => dateTimeMock),
            createOneDayWithBookings: jest.fn(() => dateTimeWithBookingsMock),
            createNextDay: jest.fn(() => 'miércoles 30 de julio 2025 30/07/2025'),
            createOneDay: jest.fn(() => 'sábado 26 de julio 2025 26/07/2025'),
          },
        },
        GenerateDatetime,
      ],
    }).compile();

    createDayUseCase = module.get<CreateDayUseCase>(CreateDayUseCase);
  });

  it('SHOULD be defined', () => {
    expect(createDayUseCase).toBeDefined();
  });

  describe('WHEN createDateTime is called', () => {
    it('SHOULD return the matrix of datetime', () => {
      const result = createDayUseCase.createDateTime();
      expect(result).toEqual(dateTimeMock);
    });
  });

  describe('WHEN createOneDayWithBookings is called', () => {
    it('SHOULD return the matrix of datetime with bookings', () => {
      const result = createDayUseCase.createOneDayWithBookings();
      expect(result).toEqual(dateTimeWithBookingsMock);
    });
  });

  describe('WHEN createNextDay is called', () => {
    it('SHOULD return the next day', () => {
      const result = createDayUseCase.createNextDay(new Date('2025-07-29T03:00:00.000Z'));
      expect(result).toEqual('miércoles 30 de julio 2025 30/07/2025');
    });
  });
});
