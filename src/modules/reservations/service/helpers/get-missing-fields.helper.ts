import { DeleteReservation } from "src/lib";

export function getMissingFields(obj: DeleteReservation): string[] {
    return Object.entries(obj)
        .filter(([_, value]) => value === null || value === undefined || value === '')
        .map(([key]) => key);
}