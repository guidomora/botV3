import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { AddDataType } from 'src/lib/types/add-data.type';

export const reservationRowsMock: DateTime = [
  ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Servicio', 'Cantidad'],
  ['martes 03 de marzo 2026 03/03/2026', '19:00', 'juan perez', '54-9-1122334455', 'Cena', '2'],
  ['martes 03 de marzo 2026 03/03/2026', '20:00', 'maria lopez', '54-9-1199988877', 'Cena', '4'],
  ['martes 03 de marzo 2026 03/03/2026', '20:30', 'otro', '54-9-1100000000', 'Cena', '3'],
  ['miercoles 04 de marzo 2026 04/03/2026', '19:00', 'ana', '54-9-1177776666', 'Cena', '1'],
  ['fila invalida'],
];

export const availabilityRowsMock: DateTime = [
  ['Fecha', 'Hora', 'Mesas reservadas', 'Mesas disponibles'],
  ['martes 03 de marzo 2026 03/03/2026', '19:00', '2', '10'],
  ['martes 03 de marzo 2026 03/03/2026', '20:00', '5', '0'],
  ['martes 03 de marzo 2026 03/03/2026', '21:00', '3', '8'],
  ['miercoles 04 de marzo 2026 04/03/2026', '19:00', '1', '11'],
];

export const reservationPayloadMock: AddDataType = {
  customerData: {
    date: 'martes 03 de marzo 2026 03/03/2026',
    time: '19:00',
    name: 'Juan Perez',
    phone: '54-9-1122334455',
    quantity: 2,
  },
};

export const temporalRowMock = [
  'martes 03 de marzo 2026 03/03/2026',
  '20:00',
  'juan perez',
  '54-9-1122334455',
  'Cena',
  '2',
  'wa-123',
  'IN_PROGRESS',
  'create',
];
