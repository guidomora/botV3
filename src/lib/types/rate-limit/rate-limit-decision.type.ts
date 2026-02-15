export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  shouldNotify: boolean;
};
