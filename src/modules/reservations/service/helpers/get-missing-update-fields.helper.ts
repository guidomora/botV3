import { UpdateReservationType } from "src/lib";

export type UpdateField = keyof UpdateReservationType | 'changeTarget';

export interface UpdateMissingFields {
    current: UpdateField[];
    target: UpdateField[];
}

export function getMissingUpdateFields(state: UpdateReservationType): UpdateMissingFields {
    const current: UpdateField[] = [];

    if (!state.name) current.push('name');
    if (!state.phone) current.push('phone');
    if (!state.currentDate) current.push('currentDate');
    if (!state.currentTime) current.push('currentTime');

    const target: UpdateField[] = [];

    if (!state.newDate && !state.newTime) {
        target.push('changeTarget');
    }

    return { current, target };
}
