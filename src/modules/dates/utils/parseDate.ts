export const parseDate = (date: string): Date => {
    const trimmed = date.trim();
    const datePart = trimmed.slice(-10);
    const [dd, mm, yyyy] = datePart.split('/');

    if (!dd || !mm || !yyyy) {
        throw new Error(`Formato de fecha inválido: ${date}`);
    }
    
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export const parseDateTime = (date: string, time?: string): Date => {
    const parsedDate = parseDate(date);
    if (!time) {
        return parsedDate;
    }

    const trimmedTime = time.trim();
    const timeMatch = trimmedTime.match(/(\d{1,2})(?::(\d{2}))?/);

    if (!timeMatch) {
        throw new Error(`Formato de hora inválido: ${time}`);
    }

    const hours = Number(timeMatch[1]);
    const minutes = timeMatch[2] ? Number(timeMatch[2]) : 0;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        throw new Error(`Formato de hora inválido: ${time}`);
    }

    parsedDate.setHours(hours, minutes, 0, 0);
    return parsedDate;
}
