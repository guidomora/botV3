import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheController } from './cache.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register({isGlobal: true})],
  controllers: [CacheController],
  providers: [CacheService],
  exports: [CacheService]
})
export class CacheContextModule {}
