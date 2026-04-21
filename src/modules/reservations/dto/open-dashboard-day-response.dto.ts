import { ApiProperty } from '@nestjs/swagger';

export class OpenDashboardDayResponseDto {
  @ApiProperty({
    description: 'Fecha del dia reabierto en formato ISO.',
    example: '2026-04-16',
  })
  date!: string;

  @ApiProperty({
    description: 'Indica si la fecha permanece cerrada luego de la operacion.',
    example: false,
  })
  isClosed!: false;
}
