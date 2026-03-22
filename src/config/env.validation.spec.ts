import { validateEnvironmentVariables } from './env.validation';

describe('validateEnvironmentVariables', () => {
  const validConfig = {
    OPEN_AI: 'openai-key',
    SPREADSHEET_ID: 'spreadsheet-id',
    GOOGLE_CLIENT_EMAIL: 'bot@example.com',
    GOOGLE_PRIVATE_KEY: 'private-key',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'auth-token',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    MAX_CAPACITY_TOTAL: '50',
  };

  it('debería aceptar una configuración válida y aplicar defaults', () => {
    const result = validateEnvironmentVariables(validConfig);

    expect(result.PORT).toBe(3000);
    expect(result.GPT_MODEL).toBe('gpt-5-mini');
    expect(result.MAX_CAPACITY_TOTAL).toBe(50);
    expect(result.RESERVATION_DURATION_MINUTES).toBe(120);
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
});
