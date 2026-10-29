// Filtros del catálogo: precio, disponibilidad, orden y exclusión.
// Requiere la base con seed (npm run db:seed).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
after(() => pool.end());

test('cada producto trae productor, finca y municipio reales', async () => {
  const r = await api.get('/api/productos');
  assert.equal(r.status, 200);
  assert.ok(r.body.items.length > 0);
  for (const p of r.body.items) {
    assert.ok(p.productor && p.finca && p.municipio, JSON.stringify(p));
    assert.equal(typeof p.verificado, 'boolean');
  }
});

test('filtra por rango de precio y ordena', async () => {
  const r = await api.get('/api/productos').query({ precioMin: 2000, precioMax: 5000, orden: 'precio_asc' });
  assert.equal(r.status, 200);
  const precios = r.body.items.map((p) => Number(p.precio));
  assert.ok(precios.length > 0);
  assert.ok(precios.every((x) => x >= 2000 && x <= 5000));
  assert.deepEqual(precios, [...precios].sort((a, b) => a - b));
});

test('filtra por disponibilidad y excluye un producto', async () => {
  const todos = (await api.get('/api/productos')).body.items;
  const r = await api.get('/api/productos').query({ stockMin: 50, excluir: todos[0].id });
  assert.equal(r.status, 200);
  assert.ok(r.body.items.every((p) => p.stock >= 50 && p.id !== todos[0].id));
});

test('rechaza un rango de precio al revés', async () => {
  const r = await api.get('/api/productos').query({ precioMin: 9000, precioMax: 100 });
  assert.equal(r.status, 400);
});

test('el teléfono del productor no aparece en el catálogo público', async () => {
  const lista = (await api.get('/api/productos')).body.items;
  const detalle = (await api.get(`/api/productos/${lista[0].id}`)).body;
  assert.equal(detalle.productor.usuario.telefono, undefined);
  const finca = (await api.get(`/api/productores/${detalle.productorId}`)).body;
  assert.equal(finca.usuario.telefono, undefined);
  assert.ok(finca.usuario.nombre);
});
