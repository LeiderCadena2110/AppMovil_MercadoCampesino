import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// Límites contra adivinar contraseñas y registros masivos.
// Se guardan en memoria: sirven con una sola instancia (Render gratis). Con varias
// instancias hay que pasarlos a Redis (rate-limit-redis) o Postgres.
const respuesta = (mensaje) => (_req, res, _next, opciones) => res.status(opciones.statusCode).json({ error: mensaje });

/** Login: 8 intentos fallidos cada 15 min por IP + correo. Los inicios correctos no cuentan. */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60_000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${String(req.body?.email ?? '').trim().toLowerCase()}`,
  handler: respuesta('Demasiados intentos de inicio de sesión. Espera 15 minutos o revisa tu contraseña.'),
});

/** Registro: 10 cuentas por hora desde la misma IP */
export const limiteRegistro = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  handler: respuesta('Se crearon muchas cuentas desde esta conexión. Inténtalo más tarde.'),
});
