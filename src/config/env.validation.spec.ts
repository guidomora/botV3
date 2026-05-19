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

  it('deberia aceptar una configuracion valida y aplicar defaults', () => {
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
    expect(result.DATABASE_HOST).toBe('localhost');
    expect(result.DATABASE_PORT).toBe(5432);
    expect(result.DATABASE_USER).toBe('botv3');
    expect(result.DATABASE_PASSWORD).toBe('botv3');
    expect(result.DATABASE_NAME).toBe('botv3');
    expect(result.DATABASE_SSL).toBe(false);
  });

  it('deberia fallar cuando falta una variable requerida', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        OPEN_AI: undefined,
      });
    }).toThrow(/OPEN_AI/);
  });

  it('deberia fallar cuando falta un origen de Twilio', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        TWILIO_WHATSAPP_FROM: undefined,
        TWILIO_MESSAGING_SERVICE_SID: undefined,
      });
    }).toThrow(/must contain at least one of/);
  });

  it('deberia fallar cuando una variable numerica es invalida', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        MAX_CAPACITY_TOTAL: '0',
      });
    }).toThrow(/MAX_CAPACITY_TOTAL/);
  });

  it('deberia aceptar configuracion Redis cuando reservation-jobs esta habilitado', () => {
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

  it('deberia fallar cuando reservation-jobs esta habilitado sin conexion Redis', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        RESERVATION_JOBS_ENABLED: 'true',
      });
    }).toThrow(/REDIS_URL o REDIS_HOST\/REDISHOST/);
  });

  it('deberia fallar cuando DATABASE_PORT no es un entero positivo', () => {
    expect(() => {
      validateEnvironmentVariables({
        ...validConfig,
        DATABASE_PORT: '0',
      });
    }).toThrow(/DATABASE_PORT/);
  });

  it('deberia parsear DATABASE_SSL como flag booleana', () => {
    const enabledResult = validateEnvironmentVariables({
      ...validConfig,
      DATABASE_SSL: 'true',
    });

    const disabledResult = validateEnvironmentVariables({
      ...validConfig,
      DATABASE_SSL: '0',
    });

    expect(enabledResult.DATABASE_SSL).toBe(true);
    expect(disabledResult.DATABASE_SSL).toBe(false);
  });
});
