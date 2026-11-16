// Firma de los avisos (webhooks) de pago, con el mismo esquema de Mercado Pago:
//   encabezado x-signature: "ts=<segundos>,v1=<hmac>"
//   hmac = HMAC-SHA256(secreto, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;") en hexadecimal
// La pasarela simulada usa exactamente la misma verificación, así el webhook se prueba igual.
import { createHmac, timingSafeEqual } from 'node:crypto';

const plantilla = ({ dataId, requestId, ts }) =>
  `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};request-id:${requestId};ts:${ts};`;

export function firmar({ dataId, requestId, ts = Math.floor(Date.now() / 1000), secreto }) {
  const v1 = createHmac('sha256', secreto).update(plantilla({ dataId, requestId, ts })).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

/** true si el encabezado x-signature corresponde a ese data.id, x-request-id y secreto */
export function firmaValida({ cabecera, dataId, requestId, secreto }) {
  if (!cabecera || !dataId || !secreto) return false;
  const partes = Object.fromEntries(String(cabecera).split(',').map((p) => p.trim().split('=').map((x) => x.trim())));
  if (!partes.ts || !partes.v1) return false;
  const esperado = createHmac('sha256', secreto).update(plantilla({ dataId, requestId: requestId ?? '', ts: partes.ts })).digest();
  const recibido = Buffer.from(partes.v1, 'hex');
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/** Saca data.id de la URL (?data.id=) o del cuerpo, como lo envía Mercado Pago */
export const idDelEvento = (req) => String(req.query['data.id'] ?? req.body?.data?.id ?? '');
