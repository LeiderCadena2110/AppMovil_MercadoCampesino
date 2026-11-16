// Envío de notificaciones push con Firebase Cloud Messaging (API HTTP v1), sin el SDK de Firebase.
// La cuenta de servicio (JSON descargado de Firebase) va completa en FIREBASE_SERVICE_ACCOUNT.
// Con ella se firma un JWT (RS256) que Google cambia por un token de acceso de 1 hora.
import { createSign } from 'node:crypto';
import { env } from '../config/env.js';

let cuenta = null;
let cache = { token: '', vence: 0 };

/** Lee la cuenta de servicio (JSON directo o en base64). null si no está configurada o es inválida. */
export function cuentaServicio() {
  if (cuenta !== null) return cuenta || null;
  const crudo = env.firebaseCuentaServicio.trim();
  cuenta = false;
  if (!crudo) return null;
  try {
    const texto = crudo.startsWith('{') ? crudo : Buffer.from(crudo, 'base64').toString('utf8');
    const c = JSON.parse(texto);
    if (c.client_email && c.private_key && c.project_id) cuenta = { ...c, private_key: c.private_key.replace(/\\n/g, '\n') };
    else console.warn('[push] FIREBASE_SERVICE_ACCOUNT no tiene client_email, private_key y project_id');
  } catch {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT no es un JSON válido');
  }
  return cuenta || null;
}

export const pushDisponible = () => !!cuentaServicio();

/** Solo para pruebas: olvida la cuenta y el token guardados */
export function reiniciarPush() {
  cuenta = null;
  cache = { token: '', vence: 0 };
}

const base64url = (b) => Buffer.from(b).toString('base64url');

async function tokenDeAcceso() {
  if (cache.token && Date.now() < cache.vence) return cache.token;
  const c = cuentaServicio();
  const ahora = Math.floor(Date.now() / 1000);
  const uri = c.token_uri ?? 'https://oauth2.googleapis.com/token';
  const cabecera = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify({
    iss: c.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: uri, iat: ahora, exp: ahora + 3600,
  }));
  const firma = createSign('RSA-SHA256').update(`${cabecera}.${cuerpo}`).sign(c.private_key, 'base64url');
  const r = await fetch(uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cabecera}.${cuerpo}.${firma}` }),
  });
  if (!r.ok) throw new Error(`Google OAuth respondió ${r.status}`);
  const datos = await r.json();
  cache = { token: datos.access_token, vence: Date.now() + (datos.expires_in - 60) * 1000 };
  return cache.token;
}

/**
 * Envía una notificación a un dispositivo.
 * @returns {'ok' | 'token-invalido' | 'error'}  token-invalido: la app se desinstaló o el token cambió
 */
export async function enviarPush(token, { titulo, cuerpo, datos = {} }) {
  const c = cuentaServicio();
  if (!c) return 'error';
  try {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await tokenDeAcceso()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: titulo, body: cuerpo },
          // FCM solo acepta textos en data
          data: Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, String(v)])),
          android: { priority: 'high', notification: { channel_id: 'pedidos', color: '#2B7F3A' } },
        },
      }),
    });
    if (r.ok) return 'ok';
    const detalle = await r.text();
    if (r.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT.*token/i.test(detalle)) return 'token-invalido';
    console.warn(`[push] FCM respondió ${r.status}: ${detalle.slice(0, 200)}`);
    return 'error';
  } catch (e) {
    console.warn('[push] no se pudo enviar:', e.message);
    return 'error';
  }
}
