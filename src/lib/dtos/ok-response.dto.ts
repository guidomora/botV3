import { ApiProperty } from '@nestjs/swagger';

export class OkResponseDto {
  @ApiProperty({
    description: 'Indica que el webhook fue aceptado y procesado correctamente.',
    example: true,
  })
  ok!: boolean;
}
