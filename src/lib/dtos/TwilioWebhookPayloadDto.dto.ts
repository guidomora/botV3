import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class TwilioWebhookPayloadDto {
  @ApiProperty({
    description: 'Texto del mensaje enviado por el usuario de WhatsApp.',
    example: 'Quiero reservar para mañana a las 21',
  })
  @IsString()
  @IsNotEmpty()
  Body!: string;

  @ApiProperty({
    description: 'Remitente en formato WhatsApp provisto por Twilio.',
    example: 'whatsapp:+5491123456789',
  })
  @IsString()
  @IsNotEmpty()
  From!: string;

  @ApiProperty({
    description: 'Numero destino configurado en Twilio.',
    example: 'whatsapp:+14155238886',
  })
  @IsString()
  @IsNotEmpty()
  To!: string;

  @ApiProperty({
    description: 'Identificador de WhatsApp del remitente.',
    example: '5491123456789',
  })
  @IsString()
  @IsNotEmpty()
  WaId!: string;

  @ApiPropertyOptional({
    description: 'Nombre visible del perfil de WhatsApp del remitente.',
    example: 'Guido',
  })
  @IsString()
  @IsOptional()
  ProfileName?: string;

  @ApiProperty({
    description: 'Identificador unico del mensaje asignado por Twilio.',
    example: 'SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  MessageSid!: string;

  @ApiProperty({
    description: 'Identificador de la cuenta de Twilio.',
    example: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  AccountSid!: string;

  @ApiPropertyOptional({
    description: 'Cantidad de adjuntos multimedia enviados en el webhook.',
    example: '0',
  })
  @IsNumberString()
  @IsOptional()
  NumMedia?: string;

  @ApiPropertyOptional({
    description: 'Tipo de mensaje interpretado por Twilio.',
    example: 'text',
  })
  @IsString()
  @IsOptional()
  MessageType?: string;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales del canal enviados por Twilio.',
    example: '{"wa_meta":"value"}',
  })
  @IsString()
  @IsOptional()
  ChannelMetadata?: string;
}
