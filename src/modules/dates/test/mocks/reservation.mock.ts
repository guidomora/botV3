import { CreateReservationType, DeleteReservation } from "src/lib";

export const createReservationMock: CreateReservationType = {
  date: "sábado 26 de julio 2025 26/07/2025",
  time: "12:00",
  name: "Juan",
  phone: "123456789",
  quantity: 2,
};

export const newRowReservationMock: CreateReservationType = {
  date: "sábado 26 de julio 2025 26/07/2025",
  time: "12:00",
  name: "Pedro",
  phone: "987654321",
  quantity: 3,
};

export const deleteReservationMock: DeleteReservation = {
  date: "sábado 26 de julio 2025 26/07/2025",
  time: "12:00",
  name: "Juan",
  phone: "123456789",
};