import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheModule } from '@nestjs/cache-manager';
import { DatesModule } from '../dates/dates.module';
import { ConfigModule } from '@nestjs/config';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';
import { CacheMonitorService } from './cache-monitor.service';
import { WhatsappAgentCacheService } from './whatsapp-agent-cache.service';
import { ClosureNotificationCacheService } from './closure-notification-cache.service';

@Module({
  imports: [CacheModule.register({ isGlobal: true, ttl: 0 }), DatesModule, ConfigModule],
  providers: [
    CacheService,
    WhatsappAgentCacheService,
    ClosureNotificationCacheService,
    ConversationExpirationNotifierService,
    CacheMonitorService,
  ],
  exports: [CacheService],
})
export class CacheContextModule {}
