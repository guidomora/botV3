import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    async get(key: string) {
        return await this.cacheManager.get(key);
    }

    async set(key: string, value: string) { // TODO: add TTL
        const newValue = {userMessage: value}
        return await this.cacheManager.set(key, newValue);
    }

    async del(key: string) {
        return await this.cacheManager.del(key);
    }
}
