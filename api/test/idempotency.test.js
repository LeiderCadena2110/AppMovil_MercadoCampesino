// POST /pedidos con Idempotency-Key: un reintento no crea pedidos ni descuenta stock dos veces.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
let token; let producto;
after(() => pool.end());
before(async () => {
  token = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 3);
});

const pedir = (clave, cantidad = 1) => api.post('/api/pedidos').set('Authorization', `Bearer ${token}`)
  .set(clave ? { 'Idempotency-Key': clave } : {})
  .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad }] });

test('la misma clave devuelve los mismos pedidos y descuenta stock una sola vez', async () => {
  const clave = randomUUID();
  const stockAntes = (await api.get(`/api/productos/${producto.id}`)).body.stock;
  const r1 = await pedir(clave);
  const r2 = await pedir(clave);
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.equal(r2.status, 201);
  assert.equal(r2.headers['idempotent-replayed'], 'true');
  assert.deepEqual(r2.body.map((p) => p.id), r1.body.map((p) => p.id));
  const stockDespues = (await api.get(`/api/productos/${producto.id}`)).body.stock;
  assert.equal(stockDespues, stockAntes - 1);
});

test('dos peticiones simultáneas con la misma clave crean un solo pedido', async () => {
  const clave = randomUUID();
  const [a, b] = await Promise.all([pedir(clave), pedir(clave)]);
  assert.deepEqual([a.status, b.status].sort(), [201, 201]);
  assert.deepEqual(a.body.map((p) => p.id), b.body.map((p) => p.id));
});

test('la misma clave con otra compra se rechaza y una clave inválida también', async () => {
  const clave = randomUUID();
  assert.equal((await pedir(clave, 1)).status, 201);
  assert.equal((await pedir(clave, 2)).status, 422);
  assert.equal((await pedir('corta')).status, 400);
});

test('sin clave sigue funcionando (versiones viejas de la app)', async () => {
  assert.equal((await pedir(undefined)).status, 201);
});

test('GET /pedidos pagina de a 30 y filtra activos/cerrados', async () => {
  const r = await api.get('/api/pedidos').set('Authorization', `Bearer ${token}`);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body) && r.body.length <= 30);
  assert.ok(['true', 'false'].includes(r.headers['x-hay-mas']));
  const activos = await api.get('/api/pedidos?estado=activos').set('Authorization', `Bearer ${token}`);
  assert.ok(activos.body.every((p) => !['ENTREGADO', 'RECHAZADO'].includes(p.estado)));
  const fechas = r.body.map((p) => new Date(p.creadoEn).getTime());
  assert.deepEqual(fechas, [...fechas].sort((a, b) => b - a));
  assert.equal((await api.get('/api/pedidos?estado=otro').set('Authorization', `Bearer ${token}`)).status, 400);
});
