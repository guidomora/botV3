import { RoleEnum } from 'src/lib';
import { ClosureNotificationProcessorService } from './closure-notification-processor.service';

describe('ClosureNotificationProcessorService', () => {
  const twilioPortMock = {
    sendText: jest.fn(),
  };
  const cacheServiceMock = {
    appendEntityMessage: jest.fn(),
    setAffectedReservationState: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send day closure message and persist neutral affected reservation context', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    twilioPortMock.sendText.mockResolvedValue({});
    cacheServiceMock.appendEntityMessage.mockResolvedValue(undefined);
    cacheServiceMock.setAffectedReservationState.mockResolvedValue(undefined);

    const service = new ClosureNotificationProcessorService(
      twilioPortMock as never,
      cacheServiceMock as never,
    );

    await service.notifyReservation({
      closureType: 'day',
      date: '2026-04-16',
      sheetDate: 'jueves 16 de abril 2026 16/04/2026',
      reason: 'Cerrado por mantenimiento',
      reservation: {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    });

    const expectedMessage =
      'Hola Juan Perez, te avisamos desde El restaurante de la IA que permaneceremos cerrados el jueves 16 de abril 2026 16/04/2026, por lo que no podremos mantener tu reserva de las 21:00.\n' +
      'Motivo: Cerrado por mantenimiento\n' +
      'Podés responder este mensaje para reprogramarla o cancelarla. Disculpá las molestias.';

    expect(twilioPortMock.sendText.mock.calls[0]).toEqual(['5491122334455', expectedMessage]);
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]).toEqual([
      '5491122334455',
      expectedMessage,
      RoleEnum.ASSISTANT,
      undefined,
    ]);
    expect(cacheServiceMock.setAffectedReservationState.mock.calls[0]).toEqual([
      '5491122334455',
      {
        name: 'Juan Perez',
        phone: '5491122334455',
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        quantity: 4,
        closureType: 'day',
        closureReason: 'Cerrado por mantenimiento',
        notifiedAt: 1_700_000_000_000,
      },
    ]);
  });

  it('should send slot closure message without reason', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    twilioPortMock.sendText.mockResolvedValue({});

    const service = new ClosureNotificationProcessorService(
      twilioPortMock as never,
      cacheServiceMock as never,
    );

    await service.notifyReservation({
      closureType: 'slot',
      date: '2026-04-16',
      sheetDate: 'jueves 16 de abril 2026 16/04/2026',
      fromTime: '20:00',
      toTime: '22:00',
      reason: null,
      reservation: {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Ana Lopez',
        phone: '54-9-1166778899',
        service: 'Cena',
        quantity: 2,
      },
    });

    const [, message] = twilioPortMock.sendText.mock.calls[0] as [string, string];
    const [, affectedReservationState] = cacheServiceMock.setAffectedReservationState.mock
      .calls[0] as [string, { closureType: string; closureReason: string | null }];

    expect(message).toBe(
      'Hola Ana Lopez, te avisamos desde El restaurante de la IA que cerraremos la franja de 20:00 a 22:00 del jueves 16 de abril 2026 16/04/2026, por lo que no podremos mantener tu reserva de las 21:00.\n' +
        'Podés responder este mensaje para reprogramarla o cancelarla. Disculpá las molestias.',
    );
    expect(affectedReservationState).toMatchObject({
      closureType: 'slot',
      closureReason: null,
    });
  });
});
