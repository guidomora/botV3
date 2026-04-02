import { ApiProperty } from '@nestjs/swagger';

export class HttpErrorResponseDto {
  @ApiProperty({
    description: 'Codigo de estado HTTP devuelto por la API.',
    example: 403,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensaje de error legible para el consumidor del endpoint.',
    example: 'Invalid health check secret',
  })
  message!: string;

  @ApiProperty({
    description: 'Etiqueta estandar del error HTTP.',
    example: 'Forbidden',
  })
  error!: string;
}
