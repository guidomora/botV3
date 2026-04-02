import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorResponseDto {
  @ApiProperty({
    description: 'Codigo de estado HTTP de error de validacion.',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensajes generados por class-validator para los campos invalidos.',
    example: ['quantity must not be less than 1', 'quantity must be an integer number'],
    type: [String],
  })
  message!: string[];

  @ApiProperty({
    description: 'Etiqueta estandar para errores de validacion.',
    example: 'Bad Request',
  })
  error!: string;
}
