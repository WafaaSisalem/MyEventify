import path from 'node:path';
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile();
} catch (error) {
  // Ignore error if .env file is missing in production
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'node --env-file=.env prisma/seed.ts',
  },
});
