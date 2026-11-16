import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sesiones } from '../db/schema.js';
import { env } from '../config/env.js';
import { ErrorApp } from '../middlewares/errors.js';

const hash = (token) => createHash('sha256').update(token).digest('hex');
const vence = () => new Date(Date.now() + env.refreshDias * 24 * 60 * 60_000);

/**
 * Refresh tokens rotativos:
 *  - se entregan una vez y en la base solo queda su hash (sha256)
 *  - cada uso devuelve uno nuevo y revoca el anterior
 *  - si llega uno ya rotado (alguien lo copió), se cierran todas las sesiones del usuario
 */
export const sesionService = {
  async crear(usuarioId, dispositivo, tx = db) {
    const refreshToken = randomBytes(32).toString('base64url');
    const [sesion] = await tx.insert(sesiones).values({
      usuarioId, tokenHash: hash(refreshToken), dispositivo: dispositivo?.slice(0, 200) ?? null, expiraEn: vence(),
    }).returning({ id: sesiones.id });
    // Limpieza de sesiones vencidas o revocadas hace más de 30 días de este usuario
    await tx.delete(sesiones).where(and(eq(sesiones.usuarioId, usuarioId), or(
      lt(sesiones.expiraEn, sql`now()`), lt(sesiones.revocadaEn, sql`now() - interval '30 days'`))));
    return { refreshToken, sesionId: sesion.id };
  },

  /** Valida y rota el refresh token. Devuelve el usuario dueño y el token nuevo. */
  async rotar(refreshToken, dispositivo) {
    const resultado = await db.transaction(async (tx) => {
      const [actual] = await tx.select().from(sesiones).where(eq(sesiones.tokenHash, hash(refreshToken))).for('update');
      if (!actual) return { error: 'Sesión vencida o inválida' };
      if (actual.revocadaEn) {
        // Reuso de un token ya rotado: se asume robo y se cierra todo
        if (actual.reemplazadaPor) {
          await tx.update(sesiones).set({ revocadaEn: sql`now()` })
            .where(and(eq(sesiones.usuarioId, actual.usuarioId), isNull(sesiones.revocadaEn)));
          return { error: 'Por seguridad se cerraron tus sesiones. Inicia sesión de nuevo.' };
        }
        return { error: 'Sesión cerrada' };
      }
      if (actual.expiraEn < new Date()) return { error: 'Sesión vencida' };

      const nueva = await this.crear(actual.usuarioId, dispositivo ?? actual.dispositivo, tx);
      await tx.update(sesiones).set({ revocadaEn: sql`now()`, reemplazadaPor: nueva.sesionId }).where(eq(sesiones.id, actual.id));
      return { usuarioId: actual.usuarioId, refreshToken: nueva.refreshToken };
    });
    // El error se lanza fuera de la transacción para que el cierre por reuso quede guardado
    if (resultado.error) throw new ErrorApp(401, resultado.error);
    return resultado;
  },

  async revocar(refreshToken) {
    await db.update(sesiones).set({ revocadaEn: sql`now()` })
      .where(and(eq(sesiones.tokenHash, hash(refreshToken)), isNull(sesiones.revocadaEn)));
  },
};
