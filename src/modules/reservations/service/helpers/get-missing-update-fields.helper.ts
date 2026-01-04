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

    if (state.stage === 'reschedule') {
        if (!state.newDate && !state.newTime) {
            target.push('changeTarget');
        } else {
            if (!state.newDate) target.push('newDate');
            if (!state.newTime) target.push('newTime');
        }
    }

    return { current, target };
}