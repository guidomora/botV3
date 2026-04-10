import { ApiProperty } from '@nestjs/swagger';
import { DailyReservationResponseDto } from './daily-reservation-response.dto';
import { DailyReservationSlotResponseDto } from './daily-reservation-slot-response.dto';

export class DailyReservationsSummaryResponseDto {
  @ApiProperty({
    description: 'Fecha solicitada en formato ISO.',
    example: '2026-04-10',
  })
  date!: string;

  @ApiProperty({
    description: 'Fecha normalizada al formato usado en Google Sheets.',
    example: '10/04/2026',
  })
  sheetDate!: string;

  @ApiProperty({
    description: 'Cantidad de reservas registradas para la fecha.',
    example: 8,
  })
  reservationsCount!: number;

  @ApiProperty({
    description: 'Capacidad total configurada para el dashboard.',
    example: 42,
  })
  totalCapacity!: number;

  @ApiProperty({
    description: 'Suma total de personas reservadas para la fecha.',
    example: 23,
  })
  totalPeopleReserved!: number;

  @ApiProperty({
    description: 'Listado completo de reservas de la fecha.',
    type: DailyReservationResponseDto,
    isArray: true,
  })
  reservations!: DailyReservationResponseDto[];

  @ApiProperty({
    description: 'Disponibilidad por franja horaria para la fecha.',
    type: DailyReservationSlotResponseDto,
    isArray: true,
  })
  slots!: DailyReservationSlotResponseDto[];
}
