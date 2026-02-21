import { StatusEnum } from './errors.enum';

export interface ServiceResponse {
  status: StatusEnum;
  message: string;
  error: boolean;
}
