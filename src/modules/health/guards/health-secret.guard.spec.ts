import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HEALTH_CHECK_SECRET_HEADER } from 'src/constants';
import { HealthSecretGuard } from './health-secret.guard';
import {
  createConfigServiceMock,
  createExecutionContextMock,
} from '../test/mocks/dependency-mocks';

describe('HealthSecretGuard', () => {
  it('debería permitir el acceso con secret válido', () => {
    const configService = createConfigServiceMock({
      HEALTH_CHECK_SECRET: 'super-secret',
    });
    const guard = new HealthSecretGuard(configService as unknown as ConfigService);
    const context = createExecutionContextMock({
      headers: {
        [HEALTH_CHECK_SECRET_HEADER]: 'super-secret',
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debería rechazar cuando falta el secret esperado', () => {
    const configService = createConfigServiceMock();
    const guard = new HealthSecretGuard(configService as unknown as ConfigService);
    const context = createExecutionContextMock({
      headers: {
        [HEALTH_CHECK_SECRET_HEADER]: 'super-secret',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debería rechazar cuando el secret es inválido', () => {
    const configService = createConfigServiceMock({
      HEALTH_CHECK_SECRET: 'super-secret',
    });
    const guard = new HealthSecretGuard(configService as unknown as ConfigService);
    const context = createExecutionContextMock({
      headers: {
        [HEALTH_CHECK_SECRET_HEADER]: 'otro-secret',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
