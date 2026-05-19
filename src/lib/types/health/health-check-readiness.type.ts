export type HealthCheckDependencyStatus = 'ok' | 'error' | 'disabled';

export type HealthCheckStatus = 'ok' | 'error';

export interface HealthCheckLiveResponse {
  status: 'ok';
  type: 'liveness';
  timestamp: string;
  uptimeSeconds: number;
}

export interface HealthCheckReadyResponse {
  status: HealthCheckStatus;
  type: 'readiness';
  timestamp: string;
  checks: {
    config: HealthCheckDependencyStatus;
    googleSheets: HealthCheckDependencyStatus;
    postgres: HealthCheckDependencyStatus;
    redis: HealthCheckDependencyStatus;
  };
}
