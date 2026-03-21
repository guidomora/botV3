import {
  AvailabilityResponse,
  DeleteReservation,
  Intention,
  RoleEnum,
  TemporalDataType,
  type ChatMessage,
  type UpdateReservationType,
} from 'src/lib';

export const historyMock: ChatMessage[] = [
  {
    role: RoleEnum.USER,
    content: 'Hola, quiero reservar',
    intention: Intention.CREATE,
  },
  {
    role: RoleEnum.ASSISTANT,
    content: 'Decime fecha y hora',
  },
  {
    role: RoleEnum.USER,
    content: 'Mañana a las 21',
    intention: Intention.AVAILABILITY,
  },
];

export const availabilityMock: AvailabilityResponse = {
  date_label: 'domingo 16 de marzo 2026 16/03/2026',
  columns: ['time', 'available_tables'],
  slots: [{ time: '21:00', available_tables: 4 }],
  summary: {
    first_time: '21:00',
    last_time: '21:00',
  },
};

export const reservationDataMock: TemporalDataType = {
  date: 'domingo 16 de marzo 2026 16/03/2026',
  time: '21:00',
  name: 'guido',
  phone: '54-9-1154916243',
  quantity: '4',
};

export const updateReservationDataMock: UpdateReservationType = {
  currentName: 'guido',
  phone: '54-9-1154916243',
  currentDate: 'domingo 16 de marzo 2026 16/03/2026',
  currentTime: '21:00',
  currentQuantity: '4',
  newDate: 'lunes 17 de marzo 2026 17/03/2026',
  newTime: '22:00',
  newName: 'guido actualizado',
  newQuantity: '5',
  stage: 'reschedule',
};

export const deleteReservationMock: DeleteReservation = {
  phone: '54-9-1154916243',
  date: 'domingo 16 de marzo 2026 16/03/2026',
  time: '21:00',
  name: 'guido',
};
