import { Intention, RoleEnum } from 'src/lib';
import {
  createAiServiceMock,
  createCacheServiceMock,
  createDatesServiceMock,
  simplifiedPayloadMock,
} from '../../test/mocks/dependency-mocks';
import { AvailabilityStrategy } from './availability-reservation.strategy';

describe('AvailabilityStrategy', () => {
  let strategy: AvailabilityStrategy;
  let aiServiceMock = createAiServiceMock();
  let cacheServiceMock = createCacheServiceMock();
  let datesServiceMock = createDatesServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();
    aiServiceMock = createAiServiceMock();
    cacheServiceMock = createCacheServiceMock();
    datesServiceMock = createDatesServiceMock();
    strategy = new AvailabilityStrategy(aiServiceMock, cacheServiceMock, datesServiceMock);
  });

  it('should ask for date when ai response does not include one', async () => {
    cacheServiceMock.getHistory.mockResolvedValue([{ role: RoleEnum.USER, content: 'hola' }]);
    aiServiceMock.askDateForAvailabilityAi.mockResolvedValue('Decime la fecha');

    await expect(
      strategy.execute({ intent: Intention.AVAILABILITY }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Decime la fecha',
    });

    expect(aiServiceMock.askDateForAvailabilityAi.mock.calls[0]).toEqual([
      [{ role: RoleEnum.USER, content: 'hola' }],
    ]);
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      'Decime la fecha',
      RoleEnum.ASSISTANT,
    ]);
    expect(cacheServiceMock.markFlowCompleted.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
  });

  it('should answer day availability when date exists without time', async () => {
    const availability = {
      date_label: 'domingo 29 de marzo 2026 29/03/2026',
      is_closed_day: false,
      columns: ['time', 'available_tables'] as ['time', 'available_tables'],
      slots: [{ time: '21:00', available_tables: 3 }],
      summary: { first_time: '21:00', last_time: '21:00' },
    };
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getDayAvailability.mockResolvedValue(availability);
    aiServiceMock.dayAvailabilityAiResponse.mockResolvedValue('Hay disponibilidad ese dia');

    await expect(
      strategy.execute(
        { intent: Intention.AVAILABILITY, date: 'domingo 29 de marzo 2026 29/03/2026' },
        simplifiedPayloadMock,
      ),
    ).resolves.toEqual({
      reply: 'Hay disponibilidad ese dia',
    });

    expect(datesServiceMock.getDayAvailability.mock.calls[0]).toEqual([
      'domingo 29 de marzo 2026 29/03/2026',
    ]);
    expect(aiServiceMock.dayAvailabilityAiResponse.mock.calls[0]).toEqual([availability, []]);
  });

  it('should answer date and time availability when both are provided', async () => {
    const availability = {
      date_label: 'domingo 29 de marzo 2026 29/03/2026',
      is_closed_day: false,
      columns: ['time', 'available_tables'] as ['time', 'available_tables'],
      slots: [{ time: '21:00', available_tables: 1 }],
      summary: { first_time: '21:00', last_time: '21:00' },
    };
    cacheServiceMock.getHistory.mockResolvedValue([]);
    datesServiceMock.getDayAndTimeAvailability.mockResolvedValue(availability);
    aiServiceMock.dayAndTimeAvailabilityAiResponse.mockResolvedValue('Queda una mesa');

    await expect(
      strategy.execute(
        {
          intent: Intention.AVAILABILITY,
          date: 'domingo 29 de marzo 2026 29/03/2026',
          time: '21:00',
        },
        simplifiedPayloadMock,
      ),
    ).resolves.toEqual({
      reply: 'Queda una mesa',
    });

    expect(datesServiceMock.getDayAndTimeAvailability.mock.calls[0]).toEqual([
      'domingo 29 de marzo 2026 29/03/2026',
      '21:00',
    ]);
    expect(aiServiceMock.dayAndTimeAvailabilityAiResponse.mock.calls[0]).toEqual([
      availability,
      [],
      '21:00',
    ]);
  });
});
