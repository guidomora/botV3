import { FlowLifecycleStatus } from './lifecycle-status.enum';

export interface ConversationLifecycleState {
  waId: string;
  status: FlowLifecycleStatus;
  flowStartedAt: number;
  hardExpireAt: number;
  expiresAt: number;
}
