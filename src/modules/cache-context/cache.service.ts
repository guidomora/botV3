import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Intention, ChatMessage, RoleEnum, DeleteReservation } from 'src/lib';

@Injectable()
export class CacheService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    private readonly MAX = 30;         // máx mensajes por hilo
    private readonly TTL = 60 * 60 * 1000;    // 1 hora
    private readonly PREFIX = 'thread:';
    private readonly CANCEL_PREFIX = 'cancel:';

    private key(waId: string, prefix: string) {
        return `${prefix}${waId}`;
    }

    async getHistory(waId: string): Promise<ChatMessage[]> {
        const key = this.key(waId, this.PREFIX);
        const data = await this.cacheManager.get(key) ?? [];

        return Array.isArray(data) ? data : [];
    }

    private async getCancelData(waId: string): Promise<DeleteReservation> {
        const key = this.key(waId, this.CANCEL_PREFIX);
        const data = await this.cacheManager.get<DeleteReservation>(key);

        return data ?? { phone: null, date: null, time: null, name: null };
    }

    private async setHistory(waId: string, history: ChatMessage[]) {
        const key = this.key(waId, this.PREFIX);
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
        await this.cacheManager.del(this.key(waId, this.PREFIX));
    }

    async setCancelState(waId: string, state: DeleteReservation) {
        const key = this.key(waId, this.CANCEL_PREFIX);
        await this.cacheManager.set(key, state, this.TTL);
    }

    async updateCancelState(waId: string, patch: Partial<DeleteReservation>) {
    const current = await this.getCancelData(waId);
    const next: DeleteReservation = {
      phone: patch.phone ?? current.phone,
      date:  patch.date  ?? current.date,
      time:  patch.time  ?? current.time,
      name:  patch.name  ?? current.name,
    };
    await this.setCancelState(waId, next);
    return next;
  }

    async appendEntityMessage(waId: string, content: string, role: RoleEnum, intention?: Intention) {
        return this.appendMessage(waId, { role, content }, intention);
    }

    async deleteData(key: string) {
        return await this.cacheManager.del(key);
    }
}
