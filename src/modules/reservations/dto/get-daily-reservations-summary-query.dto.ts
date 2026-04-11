import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class GetDailyReservationsSummaryQueryDto {
  @ApiProperty({
    description: 'Fecha a consultar en formato ISO yyyy-mm-dd.',
    example: '2026-04-10',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in yyyy-mm-dd format',
  })
  date!: string;
}
