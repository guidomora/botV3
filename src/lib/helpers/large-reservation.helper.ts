const DEFAULT_MAX_PEOPLE_PER_RESERVATION = 12;

export interface LargeReservationValidation {
  isLargeReservation: boolean;
  maxPeoplePerReservation: number;
  contactNumber?: string;
}

export function getLargeReservationValidation(quantity: number): LargeReservationValidation {
  const parsedLimit = Number(process.env.MAX_PEOPLE_PER_RESERVATION);
  const maxPeoplePerReservation =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : DEFAULT_MAX_PEOPLE_PER_RESERVATION;

  const rawContactNumber = process.env.LARGE_RESERVATION_CONTACT_NUMBER?.trim();

  return {
    isLargeReservation: quantity > maxPeoplePerReservation,
    maxPeoplePerReservation,
    contactNumber: rawContactNumber && rawContactNumber.length > 0 ? rawContactNumber : undefined,
  };
}

