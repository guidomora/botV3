import {
  AddMissingFieldOutput,
  AffectedReservationState,
  DashboardReservation,
  DeleteReservation,
  Intention,
  MultipleMessagesResponse,
  RoleEnum,
  StatusEnum,
  SimplifiedTwilioWebhookPayload,
  TemporalStatusEnum,
  UpdateAiResponse,
  UpdateReservationType,
} from 'src/lib';
import { AiService } from 'src/modules/ai/service/ai.service';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { UsageLimitService } from 'src/modules/billing-usage/service/usage-limit.service';
import { IntentionsRouter } from '../../service/intention/intention.router';
import { CreateReservationQueueService } from 'src/modules/reservation-jobs/service/create-reservation-queue.service';
import { DeleteReservationQueueService } from 'src/modules/reservation-jobs/service/delete-reservation-queue.service';
import { UpdateReservationQueueService } from 'src/modules/reservation-jobs/service/update-reservation-queue.service';

export const createAiServiceMock = () =>
  ({
    isSocialCourtesyMessage: jest.fn<Promise<boolean>, [string]>(),
    interactWithAi: jest.fn<Promise<MultipleMessagesResponse>, [string, unknown[]]>(),
    interactUpdateWithAi: jest.fn<Promise<UpdateAiResponse>, [string, unknown[]]>(),
    askDateForAvailabilityAi: jest.fn<Promise<string>, [unknown[]]>(),
    dayAvailabilityAiResponse: jest.fn<Promise<string>, [unknown, unknown[]]>(),
    dayAndTimeAvailabilityAiResponse: jest.fn<Promise<string>, [unknown, unknown[], string]>(),
    getMissingData: jest.fn<Promise<string>, [string[], unknown[], string | undefined]>(),
    reservationCompleted: jest.fn<Promise<string>, [unknown, unknown[]]>(),
    createReservationFailed: jest.fn<Promise<string>, [unknown, unknown[], string]>(),
    getMissingDataToCancel: jest.fn<Promise<string>, [string[], unknown[], DeleteReservation]>(),
    cancelReservationResult: jest.fn<Promise<string>, [string, unknown[], DeleteReservation]>(),
    otherIntentionAi: jest.fn<Promise<string>, [unknown[]]>(),
    askUpdateReservationPhone: jest.fn<Promise<string>, [unknown[], UpdateReservationType]>(),
    askUpdateReservationData: jest.fn<
      Promise<string>,
      [(keyof UpdateReservationType | 'changeTarget')[], unknown[], UpdateReservationType]
    >(),
  }) as unknown as jest.Mocked<AiService>;

export const createIntentionsRouterMock = () =>
  ({
    route: jest.fn<
      Promise<{ reply: string }>,
      [MultipleMessagesResponse, SimplifiedTwilioWebhookPayload]
    >(),
  }) as unknown as jest.Mocked<IntentionsRouter>;

export const createCacheServiceMock = () =>
  ({
    appendEntityMessage: jest.fn<Promise<void>, [string, string, RoleEnum]>(),
    getHistory: jest.fn<Promise<unknown[]>, [string]>(),
    markFlowCompleted: jest.fn<Promise<void>, [string]>(),
    updateCancelState: jest.fn<Promise<DeleteReservation>, [string, Partial<DeleteReservation>]>(),
    clearHistory: jest.fn<Promise<void>, [string, string]>(),
    getUpdateState: jest.fn<Promise<UpdateReservationType>, [string]>(),
    updateUpdateState: jest.fn<
      Promise<UpdateReservationType>,
      [string, Partial<UpdateReservationType>]
    >(),
    clearUpdateState: jest.fn<Promise<void>, [string]>(),
    getAffectedReservationState: jest.fn<Promise<AffectedReservationState | null>, [string]>(),
    setAffectedReservationState: jest.fn<Promise<void>, [string, AffectedReservationState]>(),
    clearAffectedReservationState: jest.fn<Promise<void>, [string]>(),
  }) as unknown as jest.Mocked<CacheService>;

export const createDatesServiceMock = () =>
  ({
    getDayAvailability: jest.fn<Promise<unknown>, [string]>(),
    getDayAndTimeAvailability: jest.fn<Promise<unknown>, [string, string]>(),
    createReservationWithMultipleMessages: jest.fn<Promise<AddMissingFieldOutput>, [unknown]>(),
    clearTemporalReservationFields: jest.fn<Promise<AddMissingFieldOutput>, [string, string[]]>(),
    deleteTemporalReservationRow: jest.fn<Promise<void>, [number]>(),
    deleteReservation: jest.fn<Promise<string>, [DeleteReservation]>(),
    getReservationIndexByData: jest.fn<Promise<number>, [string, string, string, string]>(),
    findReservationByLookup: jest.fn<
      Promise<DashboardReservation | null>,
      [string, string, string]
    >(),
    resolveAgendaDateLabel: jest.fn<Promise<string | null>, [string]>(),
    updateReservation: jest.fn<
      Promise<{ status: StatusEnum; message: string; error: boolean }>,
      [UpdateReservationType]
    >(),
  }) as unknown as jest.Mocked<DatesService>;

export const createUsageLimitServiceMock = () =>
  ({
    consumeWhatsappReservationQuota: jest.fn(),
    releaseWhatsappReservationQuota: jest.fn(),
  }) as unknown as jest.Mocked<UsageLimitService>;

export const createReservationQueueServiceMock = () =>
  ({
    createReservation: jest.fn(),
  }) as unknown as jest.Mocked<CreateReservationQueueService>;

export const createDeleteReservationQueueServiceMock = () =>
  ({
    deleteReservation: jest.fn(),
  }) as unknown as jest.Mocked<DeleteReservationQueueService>;

export const createUpdateReservationQueueServiceMock = () =>
  ({
    updateReservation: jest.fn(),
  }) as unknown as jest.Mocked<UpdateReservationQueueService>;

export const simplifiedPayloadMock: SimplifiedTwilioWebhookPayload = {
  body: 'Hola',
  from: 'whatsapp:+5491112345678',
  waId: '5491112345678',
  profileName: 'Guido',
  messageSid: 'SM123',
  accountSid: 'AC123',
  messageType: 'text',
};

export const aiCreateReservationResponseMock: MultipleMessagesResponse = {
  intent: Intention.CREATE,
  date: 'domingo 29 de marzo 2026 29/03/2026',
  time: '21:00',
  name: 'guido',
  quantity: '2',
};

export const temporalInProgressResponseMock: AddMissingFieldOutput = {
  status: TemporalStatusEnum.IN_PROGRESS,
  missingFields: ['date'],
  reservationData: {
    phone: '5491112345678',
    name: 'guido',
  },
  message: 'faltan datos',
};

export const temporalCompletedResponseMock: AddMissingFieldOutput = {
  status: TemporalStatusEnum.COMPLETED,
  rowIndex: 9,
  missingFields: [],
  reservationData: {
    date: 'domingo 29 de marzo 2026 29/03/2026',
    time: '21:00',
    phone: '5491112345678',
    name: 'guido',
    quantity: '2',
  },
};

export const temporalFailedResponseMock: AddMissingFieldOutput = {
  status: TemporalStatusEnum.FAILED,
  missingFields: [],
  reservationData: {
    date: 'domingo 29 de marzo 2026 29/03/2026',
    time: '21:00',
    phone: '5491112345678',
    name: 'guido',
    quantity: '2',
  },
  message: 'sin lugar',
  errorStatus: StatusEnum.NO_AVAILABILITY,
};

export const cancelStateMock: DeleteReservation = {
  phone: '5491112345678',
  date: 'domingo 29 de marzo 2026 29/03/2026',
  time: '21:00',
  name: 'guido',
};

export const updateStateIdentifyMock: UpdateReservationType = {
  currentName: null,
  phone: null,
  currentDate: null,
  currentTime: null,
  currentQuantity: null,
  newDate: null,
  newTime: null,
  newName: null,
  newQuantity: null,
  stage: 'identify',
};

export const updateStateReadyToRescheduleMock: UpdateReservationType = {
  currentName: 'guido',
  phone: '5491112345678',
  currentDate: 'domingo 29 de marzo 2026 29/03/2026',
  currentTime: '21:00',
  currentQuantity: '2',
  newDate: null,
  newTime: null,
  newName: null,
  newQuantity: null,
  stage: 'reschedule',
};

export const aiUpdateReservationResponseMock: UpdateAiResponse = {
  intent: Intention.UPDATE,
  currentDate: 'domingo 29 de marzo 2026 29/03/2026',
  currentTime: '21:00',
  currentName: 'guido',
  currentPhone: null,
  newDate: null,
  newTime: '19:00',
  newName: null,
  newQuantity: null,
  useCurrentPhone: null,
};
