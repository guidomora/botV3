import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckLiveResponseDto {
  @ApiProperty({
    description: 'Estado general del endpoint de liveness.',
    example: 'ok',
  })
  status!: 'ok';

  @ApiProperty({
    description: 'Tipo de health check ejecutado.',
    example: 'liveness',
  })
  type!: 'liveness';

  @ApiProperty({
    description: 'Marca de tiempo ISO 8601 del momento del chequeo.',
    example: '2026-04-02T15:04:05.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Cantidad de segundos que lleva levantado el proceso.',
    example: 1842,
  })
  uptimeSeconds!: number;
}
