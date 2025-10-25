import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ChatMessage, RoleEnum } from 'src/lib/types/cache/cache-types';

@Injectable()
export class CacheService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async get(key: string) {
        return await this.cacheManager.get(key);
    }

    async set(key: string, value: string) { // TODO: add TTL
        const newValue = { userMessage: value }
        return await this.cacheManager.set(key, newValue);
    }

    async appendUserMessage(key: string, value: string) {
        const prev = (await this.cacheManager.get<ChatMessage[]>(key)) || [];
        const newEntry = { role: RoleEnum.USER, content: value, ts: Date.now() };
        const updated = [...prev, newEntry];

        await this.cacheManager.set(key, updated);
    }

    async appendAssistantMessage(key: string, value: string) {
        const prev = (await this.cacheManager.get<ChatMessage[]>(key)) || [];
        const newEntry = { role: RoleEnum.ASSISTANT, content: value, ts: Date.now() };
        const updated = [...prev, newEntry];

        await this.cacheManager.set(key, updated);
    }

    async del(key: string) {
        return await this.cacheManager.del(key);
    }
}
