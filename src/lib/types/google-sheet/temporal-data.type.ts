export interface TemporalDataType {
    date?: string;
    time?: string;
    name?: string;
    phone?: string;
    quantity?: string;
}

export enum TemporalStatusEnum {
    JUST_STARTED = 'JUST_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}