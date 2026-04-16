import { ApiProperty } from '@nestjs/swagger';
import { DailyReservationSlotResponseDto } from './daily-reservation-slot-response.dto';

export class DailyReservationSlotsResponseDto {
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
    description: 'Disponibilidad por franja horaria para la fecha.',
    type: DailyReservationSlotResponseDto,
    isArray: true,
  })
  slots!: DailyReservationSlotResponseDto[];
}
