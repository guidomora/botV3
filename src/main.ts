import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AGENDA_SYNC_SIGNATURE_HEADER,
  AGENDA_SYNC_TIMESTAMP_HEADER,
  HEALTH_CHECK_SECRET_HEADER,
  INTERNAL_API_TOKEN_HEADER,
} from './constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('bot');
  app.enableCors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', INTERNAL_API_TOKEN_HEADER],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.use(bodyParser.urlencoded({ extended: false, limit: '100kb' }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('botV3 API')
    .setDescription(
      'Documentacion OpenAPI de los endpoints operativos y del webhook de WhatsApp del proyecto botV3.',
    )
    .setVersion('1.0.0')
    .addTag('Communication', 'Webhook de Twilio WhatsApp y flujo de procesamiento conversacional.')
    .addTag('Health', 'Endpoints protegidos para monitoreo operativo.')
    .addTag('Dates', 'Endpoints operativos para mantenimiento manual y automatico de agenda.')
    .addTag('Reservations', 'Endpoints operativos para dashboard y gestion manual de reservas.')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-twilio-signature',
      },
      'twilio-signature',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: HEALTH_CHECK_SECRET_HEADER,
      },
      'health-secret',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: AGENDA_SYNC_TIMESTAMP_HEADER,
      },
      'agenda-sync-timestamp',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: AGENDA_SYNC_SIGNATURE_HEADER,
      },
      'agenda-sync-signature',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: INTERNAL_API_TOKEN_HEADER,
      },
      'internal-api-token',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocument, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
