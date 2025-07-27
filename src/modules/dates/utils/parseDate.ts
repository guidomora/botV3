export const parseDate = (date: string): Date => {
    const trimmed = date.trim();
    const datePart = trimmed.slice(-10);
    const [dd, mm, yyyy] = datePart.split('/');

    if (!dd || !mm || !yyyy) {
        throw new Error('Formato de fecha inválido');
    }
    
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}