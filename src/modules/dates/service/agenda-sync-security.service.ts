import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class AgendaSyncSecurityService {
  private readonly maxTimeSkewMs: number;

  constructor() {
    this.maxTimeSkewMs = parseInt(process.env.AGENDA_SYNC_MAX_TIME_SKEW_MS || '300000');
  }

  getExpectedSecret(): string | undefined {
    return process.env.AGENDA_SYNC_SECRET;
  }

  getMaxTimeSkewMs(): number {
    return this.maxTimeSkewMs;
  }

  buildSignaturePayload(method: string, path: string, timestamp: string): string {
    return `${method.toUpperCase()}:${path}:${timestamp}`;
  }

  normalizePath(originalUrl?: string): string {
    const fallbackPath = '/';

    if (!originalUrl) {
      return fallbackPath;
    }

    const [path] = originalUrl.split('?');
    return path?.trim() || fallbackPath;
  }

  isTimestampWithinAllowedWindow(timestampHeader: string, now = Date.now()): boolean {
    const timestampMs = this.parseTimestampToMs(timestampHeader);

    if (!timestampMs) {
      return false;
    }
    return Math.abs(now - timestampMs) <= this.maxTimeSkewMs;
  }

  isValidSignature(params: {
    method: string;
    path: string;
    timestamp: string;
    receivedSignature: string;
    secret: string;
  }): boolean {
    const normalizedSignature = this.normalizeSignature(params.receivedSignature);

    if (!normalizedSignature) {
      return false;
    }

    const expectedSignature = createHmac('sha256', params.secret)
      .update(this.buildSignaturePayload(params.method, params.path, params.timestamp))
      .digest();

    const receivedSignatureBuffer = this.parseHexSignature(normalizedSignature);

    if (!receivedSignatureBuffer || receivedSignatureBuffer.length !== expectedSignature.length) {
      return false;
    }

    return timingSafeEqual(receivedSignatureBuffer, expectedSignature);
  }

  private normalizeSignature(signature: string): string | undefined {
    const trimmedSignature = signature.trim();

    if (!trimmedSignature) {
      return undefined;
    }

    return trimmedSignature.startsWith('sha256=')
      ? trimmedSignature.slice('sha256='.length)
      : trimmedSignature;
  }

  private parseHexSignature(signature: string): Buffer | undefined {
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) {
      return undefined;
    }

    return Buffer.from(signature, 'hex');
  }

  private parseTimestampToMs(timestampHeader: string): number | undefined {
    if (!/^\d+$/.test(timestampHeader)) {
      return undefined;
    }

    if (timestampHeader.length === 10) {
      return parseInt(timestampHeader, 10) * 1000;
    }

    if (timestampHeader.length === 13) {
      return parseInt(timestampHeader, 10);
    }

    return undefined;
  }
}
