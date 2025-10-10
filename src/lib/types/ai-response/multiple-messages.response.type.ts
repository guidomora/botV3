import { Intention } from "./intention.enum";

export interface MultipleMessagesResponse {
    intent: Intention,
    date?: string,
    time?: string,
    name?: string,
    phone?: string,
    quantity?: string,
}
