import 'dotenv/config';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (revisa el archivo .env)`);
  return valor;
}

// Render define RENDER=true; en otros servidores usa NODE_ENV=production
const produccion = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

export const env = {
  produccion,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida('DATABASE_URL'),
  jwtSecret: requerida('JWT_SECRET'),
  // Token de acceso corto; la sesión se mantiene con el refresh token (rotativo)
  jwtExpira: process.env.JWT_EXPIRA ?? '15m',
  refreshDias: Number(process.env.REFRESH_DIAS ?? 30),
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
  // Render define RENDER_EXTERNAL_URL automáticamente
  urlPublica: process.env.URL_PUBLICA || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT ?? 3000}`,
  corsOrigen: process.env.CORS_ORIGEN ?? '*',
  // IA (opcional). Sin clave, la app usa respuestas locales básicas.
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModelo: process.env.GEMINI_MODELO || 'gemini-3.6-flash',
  // Opcional: otro modelo para cuando el principal está saturado (503)
  geminiModeloRespaldo: process.env.GEMINI_MODELO_RESPALDO ?? '',
  // Notificaciones push (opcional): JSON de la cuenta de servicio de Firebase
  firebaseCuentaServicio: process.env.FIREBASE_SERVICE_ACCOUNT ?? '',
  // Pagos en línea (opcional). Mercado Pago: credenciales de prueba TEST-... y clave del webhook.
  mpAccessToken: process.env.MP_ACCESS_TOKEN ?? '',
  mpWebhookSecret: process.env.MP_WEBHOOK_SECRET ?? '',
  // Pasarela simulada en producción (para demostrar el flujo sin una cuenta de pagos)
  pagosSimulados: process.env.PAGOS_SIMULADOS === '1',
  pagosSimuladosSecreto: process.env.PAGOS_SIMULADOS_SECRETO ?? '',
};
