import { validateEnvironmentVariables } from './env.validation';

describe('validateEnvironmentVariables', () => {
  const validConfig = {
    RESERVATION_JOBS_ENABLED: 'false',
    OPEN_AI: 'openai-key',
    SPREADSHEET_ID: 'spreadsheet-id',
    GOOGLE_CLIENT_EMAIL: 'bot@example.com',
    GOOGLE_PRIVATE_KEY: 'private-key',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'auth-token',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    MAX_CAPACITY_TOTAL: '50',
    HEALTH_CHECK_SECRET: 'super-secret',
    INTERNAL_API_TOKEN: 'internal-secret',
  };

  it('debería aceptar una configuración válida y aplicar defaults', () => {
    const result = validateEnvironmentVariables(validConfig);

    expect(result.PORT).toBe(3000);
    expect(result.RESERVATION_JOBS_ENABLED).toBe(false);
    expect(result.GPT_MODEL).toBe('gpt-5-mini');
    expect(result.MAX_CAPACITY_TOTAL).toBe(50);
    expect(result.RESERVATION_DURATION_MINUTES).toBe(120);
    expect(result.DATES_MANUAL_RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(result.DATES_MANUAL_RATE_LIMIT_MAX_REQUESTS).toBe(1);
    expect(result.HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS).toBe(15);
    expect(result.REDIS_DB).toBe(0);
    expect(result.REDIS_TLS_ENABLED).toBe(false);
  });

  it('debería fallar cuando falta una variable requerida', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        OPEN_AI: undefined,
      });
    }).toThrow(/OPEN_AI/);
  });

  it('debería fallar cuando falta un origen de Twilio', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        TWILIO_WHATSAPP_FROM: undefined,
        TWILIO_MESSAGING_SERVICE_SID: undefined,
      });
    }).toThrow(/must contain at least one of/);
  });

  it('debería fallar cuando una variable numérica es inválida', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        MAX_CAPACITY_TOTAL: '0',
      });
    }).toThrow(/MAX_CAPACITY_TOTAL/);
  });

  it('debería aceptar configuración Redis cuando reservation-jobs está habilitado', () => {
    const result = validateEnvironmentVariables({
      ...validConfig,
      RESERVATION_JOBS_ENABLED: 'true',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_TLS_ENABLED: 'true',
    });

    expect(result.RESERVATION_JOBS_ENABLED).toBe(true);
    expect(result.REDIS_URL).toBe('redis://localhost:6379');
    expect(result.REDIS_TLS_ENABLED).toBe(true);
  });

  it('debería fallar cuando reservation-jobs está habilitado sin conexión Redis', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        RESERVATION_JOBS_ENABLED: 'true',
      });
    }).toThrow(/REDIS_URL o REDIS_HOST\/REDISHOST/);
  });
});
