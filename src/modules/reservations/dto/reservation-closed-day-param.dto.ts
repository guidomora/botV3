import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const isoReservationDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export class ReservationClosedDayParamDto {
  @ApiProperty({
    description: 'Fecha a cerrar o reabrir en formato ISO yyyy-mm-dd.',
    example: '2026-04-16',
  })
  @Matches(isoReservationDatePattern, {
    message: 'date must be in yyyy-mm-dd format',
  })
  date!: string;
}
