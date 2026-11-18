// Campi sin Gemini: responde pedidos, tendencia de precios y fincas con datos reales.
import { test, after, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { env } from '../src/config/env.js';
import { intencion } from '../src/ai/campiLocal.js';

const api = request(app);
const claveReal = env.geminiApiKey;
let comprador; let productor;
before(async () => {
  env.geminiApiKey = '';
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  productor = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
});
afterEach(() => { env.geminiApiKey = ''; });
after(async () => { env.geminiApiKey = claveReal; await pool.end(); });
const preguntar = (mensaje, token = comprador) => api.post('/api/ia/asistente').set('Authorization', `Bearer ${token}`).send({ mensaje });

test('reconoce de qué habla la pregunta', () => {
  assert.equal(intencion('Como va mi pedido?'), 'pedidos');
  assert.equal(intencion('¿Cuándo llega?'), 'pedidos');
  assert.equal(intencion('¿La papa esta subiendo?'), 'precio');
  assert.equal(intencion('cuanto vale el queso'), 'precio');
  assert.equal(intencion('¿Qué fincas hay en Pasto?'), 'fincas');
  assert.equal(intencion('Quiero hacer un locro'), null);
});

test('"Como va mi pedido?" responde con el pedido real del comprador', async () => {
  const producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 1);
  const [pedido] = (await api.post('/api/pedidos').set('Authorization', `Bearer ${comprador}`).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad: 1 }] })).body;
  const r = await preguntar('Como va mi pedido?');
  assert.equal(r.status, 200);
  assert.equal(r.body.fuente, 'local');
  assert.match(r.body.respuesta, new RegExp(`#${pedido.id}`));
  assert.match(r.body.respuesta, /esperando que la finca lo confirme/);
  assert.deepEqual(r.body.consultas, ['tus pedidos']);
});

test('"¿La papa esta subiendo?" responde con el historial, no con el catálogo', async () => {
  const r = await preguntar('¿La papa esta subiendo?');
  assert.equal(r.status, 200);
  assert.match(r.body.respuesta, /\*\*Papa\*\* por /);
  assert.match(r.body.respuesta, /estable|subiendo|bajando|pocos datos/);
  assert.deepEqual(r.body.consultas, ['historial de precios']);
});

test('fincas y preguntas de recetas siguen funcionando', async () => {
  const f = await preguntar('¿Qué fincas venden hoy?');
  assert.match(f.body.respuesta, /Finca El Encano/);
  const receta = await preguntar('Quiero hacer un locro de papa');
  assert.deepEqual(receta.body.consultas, ['catálogo de hoy']);
  const prod = await preguntar('como va mi pedido', productor);
  assert.match(prod.body.respuesta, /cuenta de comprador/);
});
