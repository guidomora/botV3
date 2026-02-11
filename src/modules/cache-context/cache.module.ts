import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { DatesModule } from '../dates/dates.module';
import { ConfigModule } from '@nestjs/config';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true, ttl: 0 }),
    DatesModule,
    ConfigModule,
  ],
  controllers: [CacheController],
  providers: [CacheService, ConversationExpirationNotifierService],
  exports: [CacheService]
})
export class CacheContextModule {}
