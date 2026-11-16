// Pagos en línea de punta a punta: pedido → cobro → página de pago → webhook firmado → pedido pagado.
// Se prueba con la pasarela simulada y con Mercado Pago (API de Orders) simulado con fetch.
import { test, after, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { env } from '../src/config/env.js';
import { firmar } from '../src/payments/signature.js';
import { secretoSimulado } from '../src/payments/SimulatedGateway.js';

const api = request(app);
const fetchReal = globalThis.fetch;
let comprador; let productor;
before(async () => {
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  productor = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
});
afterEach(() => { globalThis.fetch = fetchReal; env.mpAccessToken = ''; env.mpWebhookSecret = ''; });
after(() => pool.end());

const comoComprador = (r) => r.set('Authorization', `Bearer ${comprador}`);
async function pedirEnLinea() {
  const producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 1);
  const r = await comoComprador(api.post('/api/pedidos')).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', pagarEnLinea: true, items: [{ productoId: producto.id, cantidad: 1 }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body[0];
}
const pagar = (ids) => comoComprador(api.post('/api/pagos')).send({ pedidoIds: ids });
const pedido = async (id) => (await comoComprador(api.get(`/api/pedidos/${id}`))).body;
const cobroDe = (urlPago) => urlPago.split('/').pop();

/** Envía un webhook firmado como lo haría la pasarela */
function webhook(proveedor, dataId, secreto) {
  const requestId = randomUUID();
  return api.post(`/api/pagos/${proveedor}/eventos?data.id=${dataId}&type=order`)
    .set('x-request-id', requestId).set('x-signature', firmar({ dataId, requestId, secreto }))
    .send({ type: 'order', action: 'order.updated', data: { id: dataId } });
}

test('salud informa qué pasarela está activa', async () => {
  assert.equal((await api.get('/api/salud')).body.pagos, 'simulado');
});

test('un pedido para pagar en línea queda esperando el pago y el productor no puede aceptarlo', async () => {
  const p = await pedirEnLinea();
  assert.equal(p.pagoEstado, 'PENDIENTE');
  const r = await api.patch(`/api/pedidos/${p.id}/estado`).set('Authorization', `Bearer ${productor}`).send({ estado: 'ACEPTADO' });
  assert.equal(r.status, 409);
});

test('de punta a punta: cobro → página de pago → aprobar → webhook → pedido pagado y aceptable', async () => {
  const p = await pedirEnLinea();
  const cobro = await pagar([p.id]);
  assert.equal(cobro.status, 201, JSON.stringify(cobro.body));
  assert.equal(cobro.body.proveedor, 'simulado');
  assert.equal(cobro.body.estado, 'PENDIENTE');
  assert.equal(cobro.body.monto, Number(p.total));

  // Reintentar no crea otro cobro
  assert.equal((await pagar([p.id])).body.id, cobro.body.id);

  const id = cobroDe(cobro.body.urlPago);
  const paginaPago = await api.get(`/api/pagos/simulado/${id}`);
  assert.equal(paginaPago.status, 200);
  assert.match(paginaPago.text, /Modo de prueba/);

  const fin = await api.post(`/api/pagos/simulado/${id}/resultado`).type('form').send({ resultado: 'aprobar' });
  assert.match(fin.text, /Pago aprobado/);

  assert.equal((await pedido(p.id)).pagoEstado, 'APROBADO');
  assert.equal((await comoComprador(api.get(`/api/pagos/${cobro.body.id}`))).body.estado, 'APROBADO');
  const aceptar = await api.patch(`/api/pedidos/${p.id}/estado`).set('Authorization', `Bearer ${productor}`).send({ estado: 'ACEPTADO' });
  assert.equal(aceptar.status, 200, JSON.stringify(aceptar.body));

  // Pagar de nuevo un pedido pagado no se permite
  assert.equal((await pagar([p.id])).status, 409);
});

test('pago rechazado: el pedido lo refleja y se puede volver a intentar con otro cobro', async () => {
  const p = await pedirEnLinea();
  const primero = (await pagar([p.id])).body;
  await api.post(`/api/pagos/simulado/${cobroDe(primero.urlPago)}/resultado`).type('form').send({ resultado: 'rechazar' });
  assert.equal((await pedido(p.id)).pagoEstado, 'RECHAZADO');
  const segundo = await pagar([p.id]);
  assert.equal(segundo.status, 201);
  assert.notEqual(segundo.body.id, primero.id);
  assert.equal((await pedido(p.id)).pagoEstado, 'PENDIENTE');
});

test('webhook: firma inválida → 401; aviso repetido no se procesa dos veces', async () => {
  const p = await pedirEnLinea();
  const cobro = (await pagar([p.id])).body;
  const id = cobroDe(cobro.urlPago);
  assert.equal((await webhook('simulado', id, 'secreto-falso')).status, 401);
  const sinFirma = await api.post(`/api/pagos/simulado/eventos?data.id=${id}`).send({ data: { id } });
  assert.equal(sinFirma.status, 401);

  // La pasarela marca aprobado (sin entregar su aviso) y luego llegan dos avisos auténticos
  const { pasarelas } = await import('../src/payments/index.js');
  await pasarelas.simulado.resolver(id, true);
  const a = await webhook('simulado', id, secretoSimulado());
  const b = await webhook('simulado', id, secretoSimulado());
  assert.equal(a.status, 200);
  assert.equal(a.body.cambio, true);
  assert.equal(b.status, 200);
  assert.equal(b.body.cambio, false);
});

test('el webhook nunca confía en el cuerpo: sin aprobación en la pasarela el pedido sigue pendiente', async () => {
  const p = await pedirEnLinea();
  const cobro = (await pagar([p.id])).body;
  const r = await webhook('simulado', cobroDe(cobro.urlPago), secretoSimulado());
  assert.equal(r.status, 200);
  assert.equal(r.body.estado, 'PENDIENTE');
  assert.equal((await pedido(p.id)).pagoEstado, 'PENDIENTE');
});

test('pagos solo para el comprador dueño; pedidos contra entrega no se cobran en línea', async () => {
  const p = await pedirEnLinea();
  assert.equal((await api.post('/api/pagos').set('Authorization', `Bearer ${productor}`).send({ pedidoIds: [p.id] })).status, 403);
  const producto = (await api.get('/api/productos')).body.items.find((x) => x.stock >= 1);
  const [contra] = (await comoComprador(api.post('/api/pedidos')).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad: 1 }] })).body;
  assert.equal(contra.pagoEstado, 'NO_APLICA');
  assert.equal((await pagar([contra.id])).status, 409);
  assert.equal((await pagar([999999])).status, 404);
});

test('Mercado Pago (API de Orders): crea la orden, valida el webhook con x-signature y consulta el estado real', async () => {
  env.mpAccessToken = 'TEST-prueba';
  env.mpWebhookSecret = 'clave-webhook-prueba';
  let estadoOrden = 'created';
  const orden = `ORD01J${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`; // único, como en Mercado Pago
  const enviadas = [];
  globalThis.fetch = async (url, op = {}) => {
    url = String(url);
    if (url === 'https://api.mercadopago.com/v1/orders' && op.method === 'POST') {
      enviadas.push({ headers: op.headers, cuerpo: JSON.parse(op.body) });
      return Response.json({ id: orden, status: 'created', checkout_url: 'https://www.mercadopago.com.co/checkout/v1/redirect?pref=x' }, { status: 201 });
    }
    if (url === `https://api.mercadopago.com/v1/orders/${orden}`) return Response.json({ id: orden, status: estadoOrden });
    return fetchReal(url, op);
  };
  assert.equal((await api.get('/api/salud')).body.pagos, 'mercadopago');
  const p = await pedirEnLinea();
  const cobro = await pagar([p.id]);
  assert.equal(cobro.status, 201, JSON.stringify(cobro.body));
  assert.equal(cobro.body.proveedor, 'mercadopago');
  assert.match(cobro.body.urlPago, /^https:\/\/www\.mercadopago\.com\.co\//);

  const { headers, cuerpo } = enviadas[0];
  assert.equal(headers.Authorization, 'Bearer TEST-prueba');
  assert.equal(headers['X-Idempotency-Key'], cobro.body.id);
  assert.equal(cuerpo.type, 'online');
  assert.equal(cuerpo.processing_mode, 'manual');
  assert.equal(cuerpo.external_reference, cobro.body.id);
  assert.equal(cuerpo.total_amount, String(Math.round(Number(p.total))));
  assert.equal(cuerpo.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0), Number(cuerpo.total_amount));
  assert.match(cuerpo.config.online.success_url, /\/api\/pagos\/retorno\?pago=/);

  // Firma con otra clave → 401. Firma correcta pero la orden aún no se procesa → sigue pendiente.
  assert.equal((await webhook('mercadopago', orden, 'otra-clave')).status, 401);
  assert.equal((await webhook('mercadopago', orden, 'clave-webhook-prueba')).body.estado, 'PENDIENTE');
  estadoOrden = 'processed';
  const ok = await webhook('mercadopago', orden, 'clave-webhook-prueba');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.estado, 'APROBADO');
  assert.equal((await pedido(p.id)).pagoEstado, 'APROBADO');
});

test('página de retorno sin sesión muestra solo el estado', async () => {
  const r = await api.get('/api/pagos/retorno?pago=no-es-un-id');
  assert.equal(r.status, 200);
  assert.match(r.text, /Vuelve a Minga App/);
});
