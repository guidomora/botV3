import { ApiProperty } from '@nestjs/swagger';

export class AvailableReservationDatesResponseDto {
  @ApiProperty({
    description:
      'Fechas cargadas en agenda y disponibles para consultar desde el dashboard, en formato ISO.',
    example: ['2026-04-01', '2026-04-02', '2026-04-03'],
    isArray: true,
    type: String,
  })
  dates!: string[];
}
