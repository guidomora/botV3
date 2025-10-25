export enum RoleEnum {
    USER = 'user',
    ASSISTANT = 'assistant'
}
export interface ChatMessage {
  waId: string;
  role: RoleEnum;
  content: string;
  ts: number;
}