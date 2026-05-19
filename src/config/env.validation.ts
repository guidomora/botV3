import * as Joi from 'joi';
import { EnvConfig } from 'src/lib';

const requiredString = Joi.string().trim().required();
const positiveInteger = Joi.number().integer().positive();
const booleanFlag = Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0');

export function validateEnvironmentVariables(config: Record<string, unknown>): EnvConfig {
  const schema = Joi.object<EnvConfig>({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: positiveInteger.default(3000),
    RESERVATION_JOBS_ENABLED: booleanFlag.default(false),

    OPEN_AI: requiredString,
    PROJECT_ID: Joi.string().trim().optional(),
    GPT_MODEL: Joi.string().trim().default('gpt-5-mini'),
    GPT_MODEL_UPDATE: Joi.string().trim().optional(),

    SPREADSHEET_ID: requiredString,
    GOOGLE_CLIENT_EMAIL: Joi.string().trim().email().required(),
    GOOGLE_PRIVATE_KEY: requiredString,

    TWILIO_ACCOUNT_SID: requiredString,
    TWILIO_AUTH_TOKEN: requiredString,
    TWILIO_WHATSAPP_FROM: Joi.string().trim().optional(),
    TWILIO_MESSAGING_SERVICE_SID: Joi.string().trim().optional(),
    TWILIO_STATUS_CALLBACK_URL: Joi.string().trim().uri().optional(),

    REDIS_URL: Joi.string().trim().optional(),
    REDIS_HOST: Joi.string().trim().optional(),
    REDIS_PORT: positiveInteger.optional(),
    REDIS_USERNAME: Joi.string().trim().optional(),
    REDIS_PASSWORD: Joi.string().trim().optional(),
    REDIS_DB: Joi.number().integer().min(0).default(0),
    REDIS_TLS_ENABLED: booleanFlag.default(false),
    REDISHOST: Joi.string().trim().optional(),
    REDISPORT: positiveInteger.optional(),
    REDISUSER: Joi.string().trim().optional(),
    REDISPASSWORD: Joi.string().trim().optional(),

    DATABASE_HOST: Joi.string().trim().default('localhost'),
    DATABASE_PORT: positiveInteger.default(5432),
    DATABASE_USER: Joi.string().trim().default('botv3'),
    DATABASE_PASSWORD: Joi.string().trim().default('botv3'),
    DATABASE_NAME: Joi.string().trim().default('botv3'),
    DATABASE_SSL: booleanFlag.default(false),

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
    throw new Error(`Configuracion de entorno invalida: ${validationErrors}`);
  }

  const validatedConfig = validationResult.value;
  const redisHost = validatedConfig.REDIS_HOST ?? validatedConfig.REDISHOST;
  const hasRedisConnectionConfig = Boolean(validatedConfig.REDIS_URL || redisHost);

  if (validatedConfig.RESERVATION_JOBS_ENABLED && !hasRedisConnectionConfig) {
    throw new Error(
      'Configuracion de entorno invalida: si RESERVATION_JOBS_ENABLED=true, debes definir REDIS_URL o REDIS_HOST/REDISHOST.',
    );
  }

  return validatedConfig;
}
