import { Controller, Get, Logger, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { HEALTH_CHECK_SECRET_HEADER } from 'src/constants';
import { HttpErrorResponseDto } from 'src/lib';
import { HealthRateLimitGuard } from '../guards/health-rate-limit.guard';
import { HealthSecretGuard } from '../guards/health-secret.guard';
import { HealthService } from '../service/health.service';
import { HealthCheckLiveResponseDto } from '../dto/health-check-live-response.dto';
import { HealthCheckReadyResponseDto } from '../dto/health-check-ready-response.dto';

@Controller('health')
@UseGuards(HealthSecretGuard, HealthRateLimitGuard)
@ApiTags('Health')
@ApiSecurity('health-secret')
@ApiHeader({
  name: HEALTH_CHECK_SECRET_HEADER,
  description: 'Secret requerido para consultar los endpoints de health del servicio.',
  required: true,
})
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get('/live')
  @ApiOperation({
    summary: 'Health check de liveness',
    description: 'Verifica que el proceso se encuentre levantado y respondiendo.',
  })
  @ApiOkResponse({
    description: 'El proceso esta vivo y aceptando requests.',
    type: HealthCheckLiveResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Secret ausente, invalido o rate limit aplicado por los guards.',
    type: HttpErrorResponseDto,
  })
  getLiveStatus(): HealthCheckLiveResponseDto {
    this.logger.log('Health check liveness solicitado');
    return this.healthService.getLiveStatus();
  }

  @Get('/ready')
  @ApiOperation({
    summary: 'Health check de readiness',
    description:
      'Valida configuracion critica y conectividad con Google Sheets antes de considerar al servicio listo.',
  })
  @ApiOkResponse({
    description: 'El servicio esta listo para operar con sus dependencias criticas.',
    type: HealthCheckReadyResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'El servicio responde pero no esta listo para operar correctamente.',
    type: HealthCheckReadyResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Secret ausente, invalido o rate limit aplicado por los guards.',
    type: HttpErrorResponseDto,
  })
  async getReadyStatus(): Promise<HealthCheckReadyResponseDto> {
    this.logger.log('Health check readiness solicitado');
    const result = await this.healthService.getReadyStatus();

    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
