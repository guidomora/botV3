import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ConfigModule } from '@nestjs/config';
import { DatesModule } from './modules/dates/dates.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { AiModule } from './modules/ai/ai.module';


@Module({
  imports: [ReservationsModule, GoogleSheetsModule.forRoot(), ConfigModule.forRoot({ envFilePath: '.env' }), DatesModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
