// Mapa de fincas: ubicación pública aproximada, el punto exacto nunca sale de la API.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { ubicacionPublica } from '../src/services/mapService.js';

const api = request(app);
let productor; let comprador; let productorId;
const EXACTA = { lat: 1.184567, lng: -77.123456 }; // un punto en Nariño

before(async () => {
  const r = await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' });
  productor = r.body.token;
  productorId = r.body.usuario.productor.id;
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
});
after(async () => {
  await api.delete('/api/mi-finca/ubicacion').set('Authorization', `Bearer ${productor}`);
  await pool.end();
});

const fijar = (datos, token = productor) => api.put('/api/mi-finca/ubicacion').set('Authorization', `Bearer ${token}`).send(datos);

test('sin punto marcado, la finca aparece en su municipio (con desplazamiento fijo)', async () => {
  await api.delete('/api/mi-finca/ubicacion').set('Authorization', `Bearer ${productor}`);
  const fincas = (await api.get('/api/mapa/fincas')).body;
  const f = fincas.find((x) => x.id === productorId);
  assert.ok(f, 'la finca del seed tiene productos a la venta');
  assert.equal(f.precision, 'municipio');
  assert.ok(Math.abs(f.lat - 1.2136) < 0.03 && Math.abs(f.lng + 77.2811) < 0.03, 'cerca de Pasto');
  assert.ok(f.productos > 0);
  assert.ok(Array.isArray(f.categorias));
  // El mismo productor queda siempre en el mismo sitio
  assert.deepEqual(ubicacionPublica({ id: 5 }, { lat: 1, lng: -77 }), ubicacionPublica({ id: 5 }, { lat: 1, lng: -77 }));
});

test('el productor marca su finca; el público la ve redondeada (~1 km), nunca exacta', async () => {
  const r = await fijar(EXACTA);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, EXACTA);
  const f = (await api.get('/api/mapa/fincas')).body.find((x) => x.id === productorId);
  assert.deepEqual([f.lat, f.lng, f.precision], [1.18, -77.12, 'finca']);

  const perfil = (await api.get(`/api/productores/${productorId}`)).body;
  assert.equal(perfil.lat, undefined);
  assert.deepEqual(perfil.ubicacion, { lat: 1.18, lng: -77.12, precision: 'finca' });
  const productoId = perfil.productos[0].id;
  const detalle = (await api.get(`/api/productos/${productoId}`)).body;
  assert.equal(detalle.productor.lat, undefined);
  assert.equal(detalle.productor.lng, undefined);
  assert.doesNotMatch(JSON.stringify(detalle), /1\.184567/);
});

test('solo el productor fija la ubicación, y debe estar en Nariño', async () => {
  assert.equal((await fijar(EXACTA, comprador)).status, 403);
  assert.equal((await api.put('/api/mi-finca/ubicacion').send(EXACTA)).status, 401);
  assert.equal((await fijar({ lat: 4.711, lng: -74.072 })).status, 400); // Bogotá
  assert.equal((await fijar({ lat: 'x', lng: 2 })).status, 400);
});
