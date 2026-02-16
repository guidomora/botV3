import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const requestBodySizeLimit = process.env.REQUEST_BODY_SIZE_LIMIT ?? '100kb';

  app.setGlobalPrefix('bot');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );
  app.use(bodyParser.json({ limit: requestBodySizeLimit }));
  app.use(bodyParser.urlencoded({ extended: false, limit: requestBodySizeLimit }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
