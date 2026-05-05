import { Intention } from '../ai-response';

export enum RoleEnum {
  USER = 'user',
  ASSISTANT = 'assistant',
}
export interface ChatMessage {
  // waId: string;
  role: RoleEnum;
  content: string;
  intention?: Intention;
}

export enum CacheTypeEnum {
  CANCEL = 'cancel',
  AVAILABILITY = 'availability',
  UPDATE = 'update',
  AFFECTED_RESERVATION = 'affected-reservation',
  CLOSURE_NOTIFICATION = 'closure-notification',
  CLOSURE_NOTIFICATION_OPERATION = 'closure-notification-operation',
  DATA = 'data',
  OTHER = 'other',
}
