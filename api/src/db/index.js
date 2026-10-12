import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Neon exige SSL; en local (localhost) no.
const usarSsl = !/localhost|127\.0\.0\.1/.test(env.databaseUrl);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: usarSsl ? { rejectUnauthorized: true } : false,
  max: 10,
});

export const db = drizzle(pool, { schema });
