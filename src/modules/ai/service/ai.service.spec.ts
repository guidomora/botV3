import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import {
  AvailabilityResponse,
  DeleteReservation,
  Intention,
  ProviderError,
  ProviderName,
  RoleEnum,
  TemporalDataType,
  type ChatMessage,
  type UpdateReservationType,
} from 'src/lib';
import { AI_CLIENT_PORT } from '../ai.tokens';
import { createOpenAiClientMock } from '../test/mocks/dependency-mocks';

describe('AiService', () => {
  let service: AiService;
  let openAiClientMock = createOpenAiClientMock();

  const history: ChatMessage[] = [
    {
      role: RoleEnum.USER,
      content: 'Hola, quiero reservar',
      intention: Intention.CREATE,
    },
    {
      role: RoleEnum.ASSISTANT,
      content: 'Decime fecha y hora',
    },
    {
      role: RoleEnum.USER,
      content: 'Manana a las 21',
      intention: Intention.AVAILABILITY,
    },
  ];

  const availability: AvailabilityResponse = {
    date_label: 'domingo 16 de marzo 2026 16/03/2026',
    is_closed_day: false,
    columns: ['time', 'available_tables'],
    slots: [{ time: '21:00', available_tables: 4 }],
    summary: {
      first_time: '21:00',
      last_time: '21:00',
    },
  };

  const reservationData: TemporalDataType = {
    date: 'domingo 16 de marzo 2026 16/03/2026',
    time: '21:00',
    name: 'guido',
    phone: '54-9-1154916243',
    quantity: '4',
  };

  const updateReservationData: UpdateReservationType = {
    currentName: 'guido',
    phone: '54-9-1154916243',
    currentDate: 'domingo 16 de marzo 2026 16/03/2026',
    currentTime: '21:00',
    currentQuantity: '4',
    newDate: 'lunes 17 de marzo 2026 17/03/2026',
    newTime: '22:00',
    newName: 'guido actualizado',
    newQuantity: '5',
    stage: 'reschedule',
  };

  const deleteReservation: DeleteReservation = {
    phone: '54-9-1154916243',
    date: 'domingo 16 de marzo 2026 16/03/2026',
    time: '21:00',
    name: 'guido',
  };

  beforeEach(async () => {
    openAiClientMock = createOpenAiClientMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: AI_CLIENT_PORT,
          useValue: openAiClientMock,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GPT_MODEL;
    delete process.env.GPT_MODEL_UPDATE;
  });

  it('should call OpenAI with json response format and parse interaction response', async () => {
    openAiClientMock.createChatCompletion.mockResolvedValue(
      JSON.stringify({
        intent: Intention.AVAILABILITY,
        date: 'domingo 16 de marzo 2026 16/03/2026',
      }),
    );

    await expect(service.interactWithAi('Quiero mesa manana', history)).resolves.toEqual({
      intent: Intention.AVAILABILITY,
      date: 'domingo 16 de marzo 2026 16/03/2026',
    });

    const createCall = openAiClientMock.createChatCompletion.mock.calls[0]?.[0];

    expect(createCall).toBeDefined();
    expect(createCall?.responseFormat).toBe('json_object');
    expect(createCall?.systemPrompt).toContain('[user:availability] Manana a las 21');
    expect(createCall?.userMessage).toBe('Quiero mesa manana');
  });

  it('should call OpenAI with the dedicated update model and parse update extraction response', async () => {
    process.env.GPT_MODEL_UPDATE = 'gpt-5.4-mini';
    openAiClientMock.createChatCompletion.mockResolvedValue(
      JSON.stringify({
        intent: Intention.UPDATE,
        currentDate: 'lunes 17 de marzo 2026 17/03/2026',
        currentTime: '21:00',
        newTime: '19:00',
      }),
    );

    await expect(
      service.interactUpdateWithAi('Cambiar reserva del lunes a las 21 para las 19', history),
    ).resolves.toEqual({
      intent: Intention.UPDATE,
      currentDate: 'lunes 17 de marzo 2026 17/03/2026',
      currentTime: '21:00',
      newTime: '19:00',
    });

    expect(openAiClientMock.createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.4-mini',
        responseFormat: 'json_object',
        userMessage: 'Cambiar reserva del lunes a las 21 para las 19',
      }),
    );
  });

  it('should ask OpenAI for missing data and include optional user message in prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Decime la hora.');

    await expect(
      service.getMissingData(['time'], history, 'Todavia no te dije la hora'),
    ).resolves.toBe('Decime la hora.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(
      expect.stringContaining('Todavia no te dije la hora'),
    );
  });

  it('should ask missing data to cancel including known reservation data', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Pasame el nombre.');

    await expect(
      service.getMissingDataToCancel(['name'], history, deleteReservation),
    ).resolves.toBe('Pasame el nombre.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('54-9-1154916243'));
  });

  it('should build reservation completed prompt and return provider response', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Reserva creada.');

    await expect(service.reservationCompleted(reservationData, history)).resolves.toBe(
      'Reserva creada.',
    );

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('guido'));
  });

  it('should build reservation failed prompt with error message', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('No pude crear la reserva.');

    await expect(
      service.createReservationFailed(reservationData, history, 'Sin disponibilidad'),
    ).resolves.toBe('No pude crear la reserva.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('Sin disponibilidad'));
  });

  it('should build availability response prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Hay lugar a las 21:00.');

    await expect(service.dayAvailabilityAiResponse(availability, history)).resolves.toBe(
      'Hay lugar a las 21:00.',
    );

    expect(openAiConfigSpy).toHaveBeenCalledWith(
      expect.stringContaining('domingo 16 de marzo 2026 16/03/2026'),
    );
  });

  it('should build availability by time prompt including requested time', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Para las 21:00 hay lugar.');

    await expect(
      service.dayAndTimeAvailabilityAiResponse(availability, history, '21:00'),
    ).resolves.toBe('Para las 21:00 hay lugar.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('21:00'));
  });

  it('should build update reservation data prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Confirmame la nueva cantidad.');

    await expect(
      service.askUpdateReservationData(['newQuantity'], history, updateReservationData),
    ).resolves.toBe('Confirmame la nueva cantidad.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('guido actualizado'));
    expect(openAiConfigSpy).toHaveBeenCalledWith(
      expect.stringContaining('No digas que la reserva ya fue cambiada'),
    );
  });

  it('should build update reservation phone prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Decime el telefono.');

    await expect(service.askUpdateReservationPhone(history, updateReservationData)).resolves.toBe(
      'Decime el telefono.',
    );

    expect(openAiConfigSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fecha original: domingo 16 de marzo 2026 16/03/2026'),
    );
  });

  it('should build availability date prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Para que dia queres consultar?');

    await expect(service.askDateForAvailabilityAi(history)).resolves.toBe(
      'Para que dia queres consultar?',
    );

    expect(openAiConfigSpy).toHaveBeenCalledWith(
      expect.stringContaining('[assistant] Decime fecha y hora'),
    );
  });

  it('should return true when social courtesy classification is positive', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('{"isSocialCourtesy":true}');

    await expect(service.isSocialCourtesyMessage('Gracias')).resolves.toBe(true);

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.any(String), 'Gracias', true);
  });

  it('should return false when social courtesy classification is negative', async () => {
    jest.spyOn(service, 'openAiConfig').mockResolvedValue('{"isSocialCourtesy":false}');

    await expect(service.isSocialCourtesyMessage('Necesito cancelar')).resolves.toBe(false);
  });

  it('should return false when social courtesy classification fails', async () => {
    jest.spyOn(service, 'openAiConfig').mockRejectedValue(new Error('openai failed'));

    await expect(service.isSocialCourtesyMessage('Gracias')).resolves.toBe(false);
  });

  it('should build other intention prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('No puedo ayudarte con eso.');

    await expect(service.otherIntentionAi(history)).resolves.toBe('No puedo ayudarte con eso.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('quiero reservar'));
  });

  it('should build cancel reservation result prompt', async () => {
    const openAiConfigSpy = jest
      .spyOn(service, 'openAiConfig')
      .mockResolvedValue('Reserva cancelada.');

    await expect(
      service.cancelReservationResult('Reserva eliminada', history, deleteReservation),
    ).resolves.toBe('Reserva cancelada.');

    expect(openAiConfigSpy).toHaveBeenCalledWith(expect.stringContaining('Reserva eliminada'));
  });

  it('should use env model and pass OpenAI params through port', async () => {
    process.env.GPT_MODEL = 'gpt-test-model';
    openAiClientMock.createChatCompletion.mockResolvedValue('respuesta final');

    await expect(service.openAiConfig('prompt del sistema', 'mensaje usuario')).resolves.toBe(
      'respuesta final',
    );

    expect(openAiClientMock.createChatCompletion).toHaveBeenCalledWith({
      model: 'gpt-test-model',
      responseFormat: 'text',
      systemPrompt: 'prompt del sistema',
      userMessage: 'mensaje usuario',
    });
  });

  it('should fallback to gpt-5-mini and default user message', async () => {
    delete process.env.GPT_MODEL;
    openAiClientMock.createChatCompletion.mockResolvedValue('respuesta');

    await expect(service.openAiConfig('prompt del sistema')).resolves.toBe('respuesta');

    expect(openAiClientMock.createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5-mini',
        systemPrompt: 'prompt del sistema',
        userMessage: 'Genera el mensaje ahora.',
      }),
    );
  });

  it('should wrap provider errors in ProviderError', async () => {
    openAiClientMock.createChatCompletion.mockRejectedValue(new Error('sdk failed'));

    await expect(service.openAiConfig('prompt')).rejects.toEqual(
      expect.objectContaining<Partial<ProviderError>>({
        name: 'ProviderError',
        provider: ProviderName.OPEN_AI,
        message: 'Error al interactuar con OpenAI',
      }),
    );
  });
});
