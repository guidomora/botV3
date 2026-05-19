import { DataSource } from 'typeorm';
import { DatabaseHealthService } from './database-health.service';

describe('DatabaseHealthService', () => {
  it('deberia devolver true cuando SELECT 1 responde correctamente', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const dataSource = {
      query,
    } as unknown as jest.Mocked<DataSource>;
    const service = new DatabaseHealthService(dataSource);

    await expect(service.isHealthy()).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('deberia devolver false cuando SELECT 1 falla', async () => {
    const query = jest.fn().mockRejectedValue(new Error('db-unavailable'));
    const dataSource = {
      query,
    } as unknown as jest.Mocked<DataSource>;
    const service = new DatabaseHealthService(dataSource);

    await expect(service.isHealthy()).resolves.toBe(false);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });
});
