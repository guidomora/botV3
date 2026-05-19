export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum UsageEventType {
  WHATSAPP_RESERVATION_CREATED = 'whatsapp_reservation_created',
}

export type BillingPeriodBounds = {
  start: Date;
  end: Date;
};

export type UsageLimitCheckResult =
  | {
      allowed: true;
      reason?: undefined;
    }
  | {
      allowed: false;
      reason: 'missing_active_subscription' | 'inactive_plan' | 'limit_reached';
    };

export type ConsumeWhatsappReservationQuotaParams = {
  accountId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type ConsumeWhatsappReservationQuotaResult =
  | {
      allowed: true;
      alreadyConsumed: boolean;
    }
  | {
      allowed: false;
      reason: 'missing_active_subscription' | 'inactive_plan' | 'limit_reached';
    };

export type ReleaseWhatsappReservationQuotaParams = {
  accountId: string;
  idempotencyKey: string;
};

export type ReleaseWhatsappReservationQuotaResult = {
  released: boolean;
};
