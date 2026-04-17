import { ApiProperty } from '@nestjs/swagger';
import { DailyReservationResponseDto } from './daily-reservation-response.dto';

export class CreateDashboardReservationResponseDto {
  @ApiProperty({
    description: 'Mensaje user friendly con el resultado del alta.',
    example: 'Reserva creada correctamente.',
  })
  message!: string;

  @ApiProperty({
    description: 'Reserva creada.',
    type: DailyReservationResponseDto,
  })
  reservation!: DailyReservationResponseDto;
}
