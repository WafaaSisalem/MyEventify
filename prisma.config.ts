import path from 'node:path';
import { defineConfig } from 'prisma/config';

process.loadEnvFile();

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
