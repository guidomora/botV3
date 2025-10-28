import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Intention, ChatMessage, RoleEnum } from 'src/lib';

@Injectable()
export class CacheService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    private readonly MAX = 30;         // máx mensajes por hilo
    private readonly TTL = 60 * 60 * 1000;    // 1 hora
    private readonly PREFIX = 'thread:';

    private key(waId: string) {
        return `${this.PREFIX}${waId}`;
    }

    async getHistory(waId: string): Promise<ChatMessage[]> {
        const key = this.key(waId);
        const data = await this.cacheManager.get(key) ?? [];

        return Array.isArray(data) ? data : [];
    }

    private async setHistory(waId: string, history: ChatMessage[]) {
        const key = this.key(waId);
        const trimmed = history.slice(-this.MAX);
        await this.cacheManager.set(key, trimmed, this.TTL);

        return trimmed;
    }

    async appendMessage(waId: string, msg: ChatMessage, intention?: Intention) {
        const history = await this.getHistory(waId);
        const entry = intention ? { ...msg, intention } : msg;
        history.push(entry);
        return this.setHistory(waId, history);
    }
    
    async clearHistory(waId: string) {
        await this.cacheManager.del(this.key(waId));
    }


    async appendAssistantMessage(waId: string, content: string, intention?: Intention) {
        return this.appendMessage(waId, { role: RoleEnum.ASSISTANT, content }, intention);
    }

    async appendUserMessage(waId: string, content: string) {
        return this.appendMessage(waId, { role: RoleEnum.USER, content });
    }

    async deleteData(key: string) {
        return await this.cacheManager.del(key);
    }
}
