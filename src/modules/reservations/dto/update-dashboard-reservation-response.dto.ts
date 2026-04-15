import { ApiProperty } from '@nestjs/swagger';
import { DailyReservationResponseDto } from './daily-reservation-response.dto';

export class UpdateDashboardReservationResponseDto {
  @ApiProperty({
    description: 'Mensaje user friendly con el resultado de la actualización.',
    example: 'Reserva actualizada correctamente.',
  })
  message!: string;

  @ApiProperty({
    description: 'Reserva actualizada.',
    type: DailyReservationResponseDto,
  })
  reservation!: DailyReservationResponseDto;
}
