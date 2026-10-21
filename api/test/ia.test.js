// Pruebas de las funciones de IA. Sin GEMINI_API_KEY se prueba el respaldo local,
// que no necesita internet. Requiere la base con seed (npm run db:seed).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { normalizar } from '../src/services/iaService.js';

const api = request(app);
let tokenComp; let tokenProd;

before(async () => {
  tokenComp = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  tokenProd = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
});
after(() => pool.end());

test('normalizar quita tildes', () => {
  assert.equal(normalizar('Túquerres CAFÉ'), 'tuquerres cafe');
});

test('estado de la IA es público', async () => {
  const r = await api.get('/api/ia/estado');
  assert.equal(r.status, 200);
  assert.ok(['gemini', 'local'].includes(r.body.proveedor));
});

test('el asistente pide sesión y valida el mensaje', async () => {
  assert.equal((await api.post('/api/ia/asistente').send({ mensaje: 'hola' })).status, 401);
  const r = await api.post('/api/ia/asistente').set('Authorization', `Bearer ${tokenComp}`).send({ mensaje: '' });
  assert.equal(r.status, 400);
});

test('el asistente recomienda productos reales del catálogo', async () => {
  const r = await api.post('/api/ia/asistente').set('Authorization', `Bearer ${tokenComp}`)
    .send({ mensaje: 'Quiero hacer un locro de papa' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.respuesta.length > 0);
  assert.ok(Array.isArray(r.body.productos));
  if (r.body.fuente === 'local') assert.ok(r.body.productos.some((p) => /papa/i.test(p.nombre)));
  for (const p of r.body.productos) assert.ok(p.id && p.precio && 'miniaturaUrl' in p);
});

test('descripción y precio sugerido solo para productores', async () => {
  const datos = { nombre: 'Papa pastusa', categoria: 'Tubérculos', unidad: 'arroba', municipio: 'Pasto', finca: 'Finca El Encano' };
  assert.equal((await api.post('/api/ia/descripcion').set('Authorization', `Bearer ${tokenComp}`).send(datos)).status, 403);

  const d = await api.post('/api/ia/descripcion').set('Authorization', `Bearer ${tokenProd}`).send(datos);
  assert.equal(d.status, 200);
  assert.ok(d.body.descripcion.length > 20 && d.body.descripcion.length <= 600);

  const categorias = (await api.get('/api/categorias')).body;
  const tuberculos = categorias.find((c) => c.nombre === 'Tubérculos');
  const p = await api.post('/api/ia/precio').set('Authorization', `Bearer ${tokenProd}`)
    .send({ nombre: 'Papa parda', categoriaId: tuberculos.id, unidad: 'arroba' });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.ok(p.body.sugerido > 0);
  assert.ok(p.body.minimo <= p.body.sugerido && p.body.sugerido <= p.body.maximo);
});
