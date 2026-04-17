export interface ReservationJobsRedisConfig {
  enabled: boolean;
  url?: string;
  host?: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tlsEnabled: boolean;
}
