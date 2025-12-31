import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Intention, ChatMessage, RoleEnum, DeleteReservation, CacheTypeEnum, UpdateReservationType } from 'src/lib';

@Injectable()
export class CacheService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    private readonly MAX = 30;         // máx mensajes por hilo
    private readonly TTL = 60 * 60 * 1000;    // 1 hora

    private key(waId: string, prefix: string) {
        return `${prefix}${waId}`;
    }

    async getHistory(waId: string): Promise<ChatMessage[]> {
        const key = this.key(waId, CacheTypeEnum.DATA);
        const data = await this.cacheManager.get(key) ?? [];

        return Array.isArray(data) ? data : [];
    }

    private async getCancelData(waId: string): Promise<DeleteReservation> {
        const key = this.key(waId, CacheTypeEnum.CANCEL);
        const data = await this.cacheManager.get<DeleteReservation>(key);

        return data ?? { phone: null, date: null, time: null, name: null };
    }

    private async getUpdateData(waId: string): Promise<UpdateReservationType> {
        const key = this.key(waId, CacheTypeEnum.UPDATE);
        const data = await this.cacheManager.get<UpdateReservationType>(key);

        return data ?? {
            name: null,
            phone: null,
            currentDate: null,
            currentTime: null,
            newDate: null,
            newTime: null,
            stage: 'identify'
        };
    }

    private async setHistory(waId: string, history: ChatMessage[]) {
        const key = this.key(waId, CacheTypeEnum.DATA);
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

    async getUpdateState(waId: string) {
        return this.getUpdateData(waId);
    }

    async clearHistory(waId: string, type: CacheTypeEnum) {
        await this.cacheManager.del(this.key(waId, type));
    }

    async clearCancelState(waId: string) {
        await this.cacheManager.del(this.key(waId, CacheTypeEnum.CANCEL));
    }

    async setCancelState(waId: string, state: DeleteReservation) {
        const key = this.key(waId, CacheTypeEnum.CANCEL);
        await this.cacheManager.set(key, state, this.TTL);
    }

    async clearUpdateState(waId: string) {
        await this.cacheManager.del(this.key(waId, CacheTypeEnum.UPDATE));
    }

    async setUpdateState(waId: string, state: UpdateReservationType) {
        const key = this.key(waId, CacheTypeEnum.UPDATE);
        await this.cacheManager.set(key, state, this.TTL);
    }

    async updateCancelState(waId: string, patch: Partial<DeleteReservation>) {
        const current = await this.getCancelData(waId);
        const next: DeleteReservation = {
            phone: patch.phone ?? current.phone,
            date: patch.date ?? current.date,
            time: patch.time ?? current.time,
            name: patch.name ?? current.name,
        };
        await this.setCancelState(waId, next);
        return next;
    }

    async updateUpdateState(waId: string, patch: Partial<UpdateReservationType>) {
        const current = await this.getUpdateData(waId);
        const next: UpdateReservationType = {
            name: patch.name ?? current.name,
            phone: patch.phone ?? current.phone,
            currentDate: patch.currentDate ?? current.currentDate,
            currentTime: patch.currentTime ?? current.currentTime,
            newDate: patch.newDate ?? current.newDate,
            newTime: patch.newTime ?? current.newTime,
            stage: patch.stage ?? current.stage ?? 'identify'
        };

        await this.setUpdateState(waId, next);
        return next;
    }

    async appendEntityMessage(waId: string, content: string, role: RoleEnum, intention?: Intention) {
        return this.appendMessage(waId, { role, content }, intention);
    }
}
