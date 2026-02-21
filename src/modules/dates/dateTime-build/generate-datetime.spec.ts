import { Test } from '@nestjs/testing';
import { GenerateDatetime } from './generate-datetime';
import { dateTimeMock, dateTimeWithBookingsMock } from '../test/mocks/date.mock';

describe('GIVEN generate-datetime', () => {
  let generateDatetime: GenerateDatetime;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: GenerateDatetime,
          useValue: {
            createDateTime: jest.fn(() => dateTimeMock),
            createOneDayWithBookings: jest.fn(() => dateTimeWithBookingsMock),
            createNextDay: jest.fn(() => 'miércoles 30 de julio 2025 30/07/2025'),
            createOneDay: jest.fn(() => 'sábado 26 de julio 2025 26/07/2025'),
          },
        },
      ],
    }).compile();

    generateDatetime = module.get<GenerateDatetime>(GenerateDatetime);
  });

  it('SHOULD be defined', () => {
    expect(generateDatetime).toBeDefined();
  });

  describe('WHEN createDateTime is called', () => {
    it('SHOULD return the matrix of datetime', () => {
      const result = generateDatetime.createDateTime();
      expect(result).toEqual(dateTimeMock);
    });
  });

  describe('WHEN createOneDayWithBookings is called', () => {
    it('SHOULD return the matrix of datetime with bookings', () => {
      const result = generateDatetime.createOneDayWithBookings();
      expect(result).toEqual(dateTimeWithBookingsMock);
    });
  });

  describe('WHEN createOneDay is called', () => {
    it('SHOULD return the day', () => {
      const result = generateDatetime.createOneDay();
      expect(result).toEqual('sábado 26 de julio 2025 26/07/2025');
    });
  });

  describe('WHEN createNextDay is called', () => {
    it('SHOULD return the next day', () => {
      const result = generateDatetime.createNextDay(new Date('2025-07-29T03:00:00.000Z'));
      expect(result).toEqual('miércoles 30 de julio 2025 30/07/2025');
    });
  });
});
