import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_API_TOKEN_HEADER } from 'src/constants';
import {
  createConfigServiceMock,
  createExecutionContextMock,
} from 'src/modules/health/test/mocks/dependency-mocks';
import { InternalApiTokenGuard } from './internal-api-token.guard';

describe('InternalApiTokenGuard', () => {
  it('deberia permitir el acceso con token valido', () => {
    const configService = createConfigServiceMock({
      INTERNAL_API_TOKEN: 'internal-secret',
    });
    const guard = new InternalApiTokenGuard(configService as unknown as ConfigService);
    const context = createExecutionContextMock({
      headers: {
        [INTERNAL_API_TOKEN_HEADER]: 'internal-secret',
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deberia rechazar cuando falta el token esperado', () => {
    const configService = createConfigServiceMock();
    const guard = new InternalApiTokenGuard(configService as unknown as ConfigService);
    const context = createExecutionContextMock({
      headers: {
        [INTERNAL_API_TOKEN_HEADER]: 'internal-secret',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('deberia rechazar cuando el token es invalido', () => {
    const configService = createConfigServiceMock({
      INTERNAL_API_TOKEN: 'internal-secret',
    });
    const guard = new InternalApiTokenGuard(configService as unknown as ConfigService);
    const context = createExecutionContextMock({
      headers: {
        [INTERNAL_API_TOKEN_HEADER]: 'otro-token',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
