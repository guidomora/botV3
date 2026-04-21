import { ApiProperty } from '@nestjs/swagger';
import { DashboardAvailableDate } from 'src/lib';

export class AvailableReservationDatesResponseDto {
  @ApiProperty({
    description: 'Fechas cargadas en agenda para consultar desde el dashboard, con su estado.',
    example: [
      { date: '2026-04-01', isClosed: false },
      { date: '2026-04-02', isClosed: true },
    ],
    isArray: true,
    type: Object,
  })
  dates!: DashboardAvailableDate[];
}
