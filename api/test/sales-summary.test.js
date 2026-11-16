// GET /pedidos/resumen: ventas entregadas de los últimos 7 días, solo para productores.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
let comprador; let productor;
after(() => pool.end());
before(async () => {
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  productor = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
});

const resumen = (token) => api.get('/api/pedidos/resumen').set('Authorization', `Bearer ${token}`);

test('devuelve 7 días seguidos que terminan hoy', async () => {
  const r = await resumen(productor);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.dias.length, 7);
  const hoy = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  assert.equal(r.body.dias.at(-1).fecha, hoy);
  for (let i = 1; i < 7; i++) {
    assert.equal((Date.parse(r.body.dias[i].fecha) - Date.parse(r.body.dias[i - 1].fecha)) / 86400_000, 1);
  }
});

test('un pedido entregado hoy suma al día de hoy', async () => {
  const antes = (await resumen(productor)).body;
  const producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 1);
  const creado = await api.post('/api/pedidos').set('Authorization', `Bearer ${comprador}`).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad: 1 }] });
  assert.equal(creado.status, 201, JSON.stringify(creado.body));
  const pedido = creado.body[0];
  for (const estado of ['ACEPTADO', 'LISTO', 'ENTREGADO']) {
    const r = await api.patch(`/api/pedidos/${pedido.id}/estado`).set('Authorization', `Bearer ${productor}`).send({ estado });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  const despues = (await resumen(productor)).body;
  assert.equal(despues.dias.at(-1).pedidos, antes.dias.at(-1).pedidos + 1);
  assert.equal(despues.dias.at(-1).total, antes.dias.at(-1).total + Number(pedido.total));
  assert.equal(despues.total, antes.total + Number(pedido.total));
});

test('un comprador no puede verlo', async () => {
  assert.equal((await resumen(comprador)).status, 403);
});
