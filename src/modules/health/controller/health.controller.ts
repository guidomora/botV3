import { Controller, Get, Logger, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { HealthCheckLiveResponse, HealthCheckReadyResponse } from 'src/lib';
import { HealthRateLimitGuard } from '../guards/health-rate-limit.guard';
import { HealthSecretGuard } from '../guards/health-secret.guard';
import { HealthService } from '../service/health.service';

@Controller('health')
@UseGuards(HealthSecretGuard, HealthRateLimitGuard)
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get('/live')
  getLiveStatus(): HealthCheckLiveResponse {
    this.logger.log('Health check liveness solicitado');
    return this.healthService.getLiveStatus();
  }

  @Get('/ready')
  async getReadyStatus(): Promise<HealthCheckReadyResponse> {
    this.logger.log('Health check readiness solicitado');
    const result = await this.healthService.getReadyStatus();

    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
