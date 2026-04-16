import { ApiProperty } from '@nestjs/swagger';
import { DailyReservationResponseDto } from './daily-reservation-response.dto';

export class DeleteDashboardReservationResponseDto {
  @ApiProperty({
    description: 'Mensaje user friendly con el resultado de la eliminacion.',
    example: 'Reserva eliminada correctamente.',
  })
  message!: string;

  @ApiProperty({
    description: 'Reserva eliminada.',
    type: DailyReservationResponseDto,
  })
  reservation!: DailyReservationResponseDto;
}
