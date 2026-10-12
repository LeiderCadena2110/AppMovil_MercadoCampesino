import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Para migrar se usa la URL directa de Neon (sin pooling).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './drizzle',
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
