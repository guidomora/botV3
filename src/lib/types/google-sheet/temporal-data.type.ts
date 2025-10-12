export interface TemporalDataType {
    date?: string;
    time?: string;
    name?: string;
    phone?: string;
    service?: string;
    quantity?: string;
    waId?: string;
}

export enum TemporalStatusEnum {
    NO_DATA = 'NO_DATA',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

export type AddMissingFieldInput = {
    waId: string;
    values: TemporalDataType;
    messageSid?: string;       
};

export type AddMissingFieldOutput = {
    status: TemporalStatusEnum;
    missingFields: string[];
    reservationData: TemporalDataType;
};