import { ApiProperty } from '@nestjs/swagger';

export class DailyReservationResponseDto {
  @ApiProperty({
    description: 'Fecha de la reserva tal como figura en Google Sheets.',
    example: 'viernes 10 de abril 2026 10/04/2026',
  })
  date!: string;

  @ApiProperty({
    description: 'Horario de la reserva.',
    example: '20:00',
  })
  time!: string;

  @ApiProperty({
    description: 'Nombre del cliente.',
    example: 'juan perez',
  })
  name!: string;

  @ApiProperty({
    description: 'Telefono del cliente.',
    example: '54-9-1122334455',
  })
  phone!: string;

  @ApiProperty({
    description: 'Servicio asociado a la reserva.',
    example: 'Cena',
  })
  service!: string;

  @ApiProperty({
    description: 'Cantidad de personas de la reserva.',
    example: 4,
  })
  quantity!: number;
}
