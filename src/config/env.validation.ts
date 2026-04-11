import * as Joi from 'joi';
import { EnvConfig } from 'src/lib';

const requiredString = Joi.string().trim().required();
const positiveInteger = Joi.number().integer().positive();

export function validateEnvironmentVariables(config: Record<string, unknown>): EnvConfig {
  const schema = Joi.object<EnvConfig>({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: positiveInteger.default(3000),

    OPEN_AI: requiredString,
    PROJECT_ID: Joi.string().trim().optional(),
    GPT_MODEL: Joi.string().trim().default('gpt-5-mini'),

    SPREADSHEET_ID: requiredString,
    GOOGLE_CLIENT_EMAIL: Joi.string().trim().email().required(),
    GOOGLE_PRIVATE_KEY: requiredString,

    TWILIO_ACCOUNT_SID: requiredString,
    TWILIO_AUTH_TOKEN: requiredString,
    TWILIO_WHATSAPP_FROM: Joi.string().trim().optional(),
    TWILIO_MESSAGING_SERVICE_SID: Joi.string().trim().optional(),

    MAX_CAPACITY_TOTAL: positiveInteger.required(),
    ONLINE_BUFFER_PERCENT: Joi.number().min(0).max(99).default(0),
    RESERVATION_DURATION_MINUTES: positiveInteger.default(120),
    SLOT_INTERVAL_MINUTES: positiveInteger.default(60),
    MAX_PEOPLE_PER_RESERVATION: positiveInteger.default(12),
    LARGE_RESERVATION_CONTACT_NUMBER: Joi.string().trim().optional(),

    AGENDA_DAYS_AHEAD: positiveInteger.optional(),
    AGENDA_DAYS_BACK_TO_KEEP: positiveInteger.optional(),
    AGENDA_SYNC_SECRET: Joi.string().trim().optional(),
    AGENDA_SYNC_MAX_TIME_SKEW_MS: positiveInteger.default(300000),
    AGENDA_SYNC_RATE_LIMIT_WINDOW_MS: positiveInteger.default(300000),
    AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS: positiveInteger.default(6),
    DATES_MANUAL_RATE_LIMIT_WINDOW_MS: positiveInteger.default(60000),
    DATES_MANUAL_RATE_LIMIT_MAX_REQUESTS: positiveInteger.default(1),
    HEALTH_CHECK_SECRET: requiredString,
    HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS: positiveInteger.default(15),
    INTERNAL_API_TOKEN: requiredString,

    IDEMPOTENCY_MESSAGE_SID_TTL_MS: positiveInteger.default(86400000),
    RATE_LIMIT_SHORT_WINDOW_MS: positiveInteger.default(30000),
    RATE_LIMIT_SHORT_WINDOW_LIMIT: positiveInteger.default(10),
    RATE_LIMIT_LONG_WINDOW_MS: positiveInteger.default(600000),
    RATE_LIMIT_LONG_WINDOW_LIMIT: positiveInteger.default(30),
    RATE_LIMIT_BLOCK_WINDOW_MS: positiveInteger.default(180000),
    RATE_LIMIT_NOTIFY_COOLDOWN_MS: positiveInteger.default(60000),
  })
    .or('TWILIO_WHATSAPP_FROM', 'TWILIO_MESSAGING_SERVICE_SID')
    .unknown(true);

  const validationResult = schema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (validationResult.error) {
    const validationErrors = validationResult.error.details
      .map((detail) => detail.message)
      .join(', ');
    throw new Error(`Configuración de entorno inválida: ${validationErrors}`);
  }

  return validationResult.value;
}
