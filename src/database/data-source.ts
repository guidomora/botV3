import 'dotenv/config';
import { DataSource } from 'typeorm';

const databaseSsl = process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'botv3',
  password: process.env.DATABASE_PASSWORD ?? 'botv3',
  database: process.env.DATABASE_NAME ?? 'botv3',
  entities: ['src/**/*.entity.ts', 'src/**/*.entity.js'],
  migrations: ['src/database/migrations/*.{ts,js}'],
  synchronize: false,
  ssl: databaseSsl,
});
