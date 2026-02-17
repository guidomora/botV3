# Reservations Agent

#### Rate Limit Logic

- if 10 messages in less than 30 seconds -> notifies the user and blocks them for 3min
- if 30 messages in less than 10 minutes -> notifies the user and blocks them for 3min

#### Idempotency (Twilio webhook retries)

- inbound events are deduplicated by `AccountSid + MessageSid`
- if an already processed `MessageSid` is received again, the webhook is ignored and responds `200` with `{ ok: true }`
- configurable TTL for dedup cache key with `IDEMPOTENCY_MESSAGE_SID_TTL_MS` (default: `86400000` = 24h)
