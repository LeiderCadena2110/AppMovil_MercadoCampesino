// Notificaciones push: registro de dispositivos y envío por FCM HTTP v1.
// Google se simula reemplazando fetch; la cuenta de servicio usa una llave RSA creada aquí.
import { test, after, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify, randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { env } from '../src/config/env.js';
import { reiniciarPush } from '../src/push/fcm.js';

const api = request(app);
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const CUENTA = JSON.stringify({
  type: 'service_account', project_id: 'minga-prueba', client_email: 'push@minga-prueba.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token',
});
const fetchReal = globalThis.fetch;
let comprador; let productor;
const tokenFalso = () => `fcm-${randomUUID()}-${randomUUID()}`;

before(async () => {
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  productor = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
});
afterEach(() => { globalThis.fetch = fetchReal; env.firebaseCuentaServicio = ''; reiniciarPush(); });
after(() => pool.end());

/** Simula Google: OAuth devuelve un token y FCM responde según `respuestaFcm(token)` */
function simularGoogle(respuestaFcm = () => 200) {
  env.firebaseCuentaServicio = CUENTA;
  reiniciarPush();
  const llamadas = { oauth: [], fcm: [] };
  globalThis.fetch = async (url, op) => {
    url = String(url);
    if (url.startsWith('https://oauth2.googleapis.com/')) {
      llamadas.oauth.push(new URLSearchParams(op.body.toString()).get('assertion'));
      return Response.json({ access_token: 'ya29.prueba', expires_in: 3600 });
    }
    if (url.startsWith('https://fcm.googleapis.com/')) {
      const cuerpo = JSON.parse(op.body);
      llamadas.fcm.push({ url, auth: op.headers.Authorization, cuerpo });
      const estado = respuestaFcm(cuerpo.message.token);
      return new Response(estado === 200 ? '{}' : '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}', { status: estado });
    }
    return fetchReal(url, op);
  };
  return llamadas;
}

const registrar = (jwt, token) => api.post('/api/dispositivos').set('Authorization', `Bearer ${jwt}`).send({ token });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('registrar un dispositivo pide sesión y un token válido', async () => {
  assert.equal((await api.post('/api/dispositivos').send({ token: tokenFalso() })).status, 401);
  assert.equal((await registrar(comprador, 'corto')).status, 400);
  assert.equal((await registrar(comprador, tokenFalso())).status, 204);
});

test('el mismo teléfono pasa de un usuario a otro sin duplicarse', async () => {
  const t = tokenFalso();
  await registrar(comprador, t);
  await registrar(productor, t);
  const { rows } = await pool.query('select count(*)::int n, max(usuario_id) u from dispositivos where token = $1', [t]);
  assert.equal(rows[0].n, 1);
  const { rows: [prod] } = await pool.query("select id from usuarios where email = 'productor@demo.co'");
  assert.equal(rows[0].u, prod.id);
});

test('al cambiar el estado de un pedido, el comprador recibe la notificación (JWT firmado y mensaje FCM)', async () => {
  const t = tokenFalso();
  await registrar(comprador, t);
  const llamadas = simularGoogle();
  const producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 1);
  const [pedido] = (await api.post('/api/pedidos').set('Authorization', `Bearer ${comprador}`).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad: 1 }] })).body;
  const r = await api.patch(`/api/pedidos/${pedido.id}/estado`).set('Authorization', `Bearer ${productor}`).send({ estado: 'ACEPTADO' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.estado, 'ACEPTADO');
  await esperar(300);

  const alComprador = llamadas.fcm.find((l) => l.cuerpo.message.token === t);
  assert.ok(alComprador, 'se envió al teléfono del comprador');
  assert.equal(alComprador.url, 'https://fcm.googleapis.com/v1/projects/minga-prueba/messages:send');
  assert.equal(alComprador.auth, 'Bearer ya29.prueba');
  assert.equal(alComprador.cuerpo.message.notification.title, 'Tu pedido fue aceptado');
  assert.deepEqual(alComprador.cuerpo.message.data, { tipo: 'pedido', pedidoId: String(pedido.id), rol: 'COMPRADOR' });

  // El JWT que se cambió por el token de acceso está firmado con la llave de la cuenta de servicio
  const [cab, cuerpo, firma] = llamadas.oauth[0].split('.');
  assert.ok(createVerify('RSA-SHA256').update(`${cab}.${cuerpo}`).verify(publicKey, firma, 'base64url'));
  const claims = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
});

test('los tokens que FCM ya no reconoce se borran', async () => {
  const t = tokenFalso();
  await registrar(comprador, t);
  simularGoogle((token) => (token === t ? 404 : 200));
  const { notificaciones } = await import('../src/services/notificationService.js');
  const { rows: [u] } = await pool.query("select id from usuarios where email = 'comprador@demo.co'");
  await notificaciones.avisar([u.id], { titulo: 'Prueba', cuerpo: 'Hola' });
  const { rows } = await pool.query('select 1 from dispositivos where token = $1', [t]);
  assert.equal(rows.length, 0);
});

test('sin Firebase configurado no se envía nada y nada falla', async () => {
  env.firebaseCuentaServicio = '';
  reiniciarPush();
  globalThis.fetch = async () => { throw new Error('no debería llamar a internet'); };
  const { notificaciones } = await import('../src/services/notificationService.js');
  assert.equal(await notificaciones.avisar([1], { titulo: 'x', cuerpo: 'y' }), 0);
  assert.equal((await api.get('/api/salud')).body.push, 'sin configurar');
});

test('cerrar sesión borra el dispositivo', async () => {
  const t = tokenFalso();
  await registrar(comprador, t);
  assert.equal((await api.delete('/api/dispositivos').set('Authorization', `Bearer ${comprador}`).send({ token: t })).status, 204);
  const { rows } = await pool.query('select 1 from dispositivos where token = $1', [t]);
  assert.equal(rows.length, 0);
});
