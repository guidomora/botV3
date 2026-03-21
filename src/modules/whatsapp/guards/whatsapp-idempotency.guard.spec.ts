import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { WhatsAppIdempotencyGuard } from './whatsapp-idempotency.guard';
import { IdempotencyService } from '../service/idempotency.service';
import { createIdempotencyServiceMock } from '../test/mocks/dependency-mocks';

describe('WhatsAppIdempotencyGuard', () => {
  let idempotencyServiceMock = createIdempotencyServiceMock();

  const buildContext = (body?: { AccountSid?: string; MessageSid?: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          body,
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    idempotencyServiceMock = createIdempotencyServiceMock();
    jest.clearAllMocks();
  });

  it('should allow request when account sid or message sid is missing', async () => {
    const guard = new WhatsAppIdempotencyGuard(
      idempotencyServiceMock as unknown as IdempotencyService,
    );

    await expect(guard.canActivate(buildContext({ AccountSid: 'AC123' }))).resolves.toBe(true);
    expect(idempotencyServiceMock.isDuplicateMessage.mock.calls).toHaveLength(0);
  });

  it('should allow request when message is not duplicated', async () => {
    idempotencyServiceMock.isDuplicateMessage.mockResolvedValue(false);
    const guard = new WhatsAppIdempotencyGuard(
      idempotencyServiceMock as unknown as IdempotencyService,
    );

    await expect(
      guard.canActivate(buildContext({ AccountSid: 'AC123', MessageSid: 'SM123' })),
    ).resolves.toBe(true);

    expect(idempotencyServiceMock.isDuplicateMessage.mock.calls[0]).toEqual(['AC123', 'SM123']);
  });

  it('should short-circuit request when message is duplicated', async () => {
    idempotencyServiceMock.isDuplicateMessage.mockResolvedValue(true);
    const guard = new WhatsAppIdempotencyGuard(
      idempotencyServiceMock as unknown as IdempotencyService,
    );

    await expect(
      guard.canActivate(buildContext({ AccountSid: 'AC123', MessageSid: 'SM123' })),
    ).rejects.toThrow(new HttpException({ ok: true }, HttpStatus.OK));
  });
});
