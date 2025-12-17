import { AvailabilityResponse, AvailabilitySlot } from "src/lib";


export const formatAvailabilityResponse = (
    availabilityData: string[][],
): AvailabilityResponse => {
    const rows = (availabilityData ?? [])
        .filter(r => Array.isArray(r) && r.length >= 2)
        .filter(r => r[0] && r[1]);

    if (rows.length === 0) {
        return {
            date_label: null,
            columns: ["time", "available_tables"],
            slots: [],
            summary: { first_time: null, last_time: null },
        };
    }

    const date_label = rows[0][0];

    const slots: AvailabilitySlot[] = rows
        .map((r) => {
            const time = r[1];
            const available_tables = Number(r[3] ?? r[2] ?? 0);

            return {
                time,
                available_tables: Number.isFinite(available_tables) ? available_tables : 0,
            };
        })
        .filter(s => s.available_tables > 0);

    return {
        date_label,
        columns: ["time", "available_tables"],
        slots,
        summary: {
            first_time: slots[0]?.time ?? null,
            last_time: slots[slots.length - 1]?.time ?? null,
        },
    };
};