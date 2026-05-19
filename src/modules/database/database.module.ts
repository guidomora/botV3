import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvConfig } from 'src/lib';
import { DatabaseHealthService } from './service/database-health.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig>) => {
        const databaseSsl = configService.get<boolean>('DATABASE_SSL') ?? false;

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DATABASE_HOST') ?? 'localhost',
          port: configService.get<number>('DATABASE_PORT') ?? 5432,
          username: configService.get<string>('DATABASE_USER') ?? 'botv3',
          password: configService.get<string>('DATABASE_PASSWORD') ?? 'botv3',
          database: configService.get<string>('DATABASE_NAME') ?? 'botv3',
          autoLoadEntities: true,
          synchronize: false,
          ssl: databaseSsl,
        };
      },
    }),
  ],
  providers: [DatabaseHealthService],
  exports: [DatabaseHealthService, TypeOrmModule],
})
export class DatabaseModule {}
