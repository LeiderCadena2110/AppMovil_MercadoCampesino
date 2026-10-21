import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Neon exige SSL; en local (localhost) no.
const usarSsl = !/localhost|127\.0\.0\.1/.test(env.databaseUrl);

/**
 * Limpia la cadena de conexión: quita comillas/espacios que a veces se pegan
 * y los parámetros sslmode/channel_binding de Neon, porque el SSL se configura aquí abajo
 * (si se dejan, pg los interpreta a su manera y muestra advertencias).
 */
export function limpiarUrl(url) {
  const texto = url.trim().replace(/^psql\s+/, '').replace(/^['"]|['"]$/g, '');
  try {
    const u = new URL(texto);
    u.searchParams.delete('sslmode');
    u.searchParams.delete('channel_binding');
    return u.toString();
  } catch {
    return texto;
  }
}

export const pool = new pg.Pool({
  connectionString: limpiarUrl(env.databaseUrl),
  ssl: usarSsl ? { rejectUnauthorized: true } : false,
  max: 10,
});

export const db = drizzle(pool, { schema });
