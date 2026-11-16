// Sincronización sin señal: el teléfono crea el producto con un clienteId; si la cola de cambios
// lo reenvía (la red se cayó a mitad de la respuesta), la API devuelve el mismo y no lo duplica.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
let token; let categoriaId;
before(async () => {
  token = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
  categoriaId = (await api.get('/api/categorias')).body[0].id;
});
after(() => pool.end());

const crear = (datos) => api.post('/api/mis-productos').set('Authorization', `Bearer ${token}`)
  .send({ nombre: 'Uchuva sin señal', categoriaId, precio: 6000, unidad: 'libra', stock: 10, activo: false, ...datos });
const cuantos = async (clienteId) => (await pool.query('select count(*)::int n from productos where cliente_id = $1', [clienteId])).rows[0].n;

test('el mismo clienteId enviado dos veces crea un solo producto', async () => {
  const clienteId = randomUUID();
  const a = await crear({ clienteId });
  const b = await crear({ clienteId });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  assert.equal(b.status, 200);
  assert.equal(b.headers['idempotent-replayed'], 'true');
  assert.equal(b.body.id, a.body.id);
  assert.equal(await cuantos(clienteId), 1);
});

test('dos envíos simultáneos con el mismo clienteId tampoco duplican', async () => {
  const clienteId = randomUUID();
  const [a, b] = await Promise.all([crear({ clienteId }), crear({ clienteId })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 201]);
  assert.equal(a.body.id, b.body.id);
  assert.equal(await cuantos(clienteId), 1);
});

test('sin clienteId se crea como siempre (versiones viejas de la app)', async () => {
  const a = await crear({});
  const b = await crear({});
  assert.equal(a.status, 201);
  assert.notEqual(a.body.id, b.body.id);
});

test('clienteId inválido → 400; editar no cambia el clienteId', async () => {
  assert.equal((await crear({ clienteId: 'no-es-uuid' })).status, 400);
  const clienteId = randomUUID();
  const { body: p } = await crear({ clienteId });
  const r = await api.put(`/api/mis-productos/${p.id}`).set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Uchuva editada', categoriaId, precio: 6500, unidad: 'libra', stock: 8, clienteId: randomUUID() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.clienteId, clienteId);
  assert.equal(r.body.nombre, 'Uchuva editada');
});
