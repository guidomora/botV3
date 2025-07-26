import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ConfigModule } from '@nestjs/config';
import { DatesModule } from './modules/dates/dates.module';
import { GoogleSheetsModule } from './shared/google-sheets.module';


@Module({
  imports: [ReservationsModule, GoogleSheetsModule.forRoot(), ConfigModule.forRoot({ envFilePath: '.env' }), DatesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
