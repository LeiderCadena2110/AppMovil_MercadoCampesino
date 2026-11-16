// Historial de precios: se guarda al publicar, al cambiar el precio y al pedir.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
let productor; let comprador; let categoriaId;
before(async () => {
  productor = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  categoriaId = (await api.get('/api/categorias')).body[0].id;
});
after(() => pool.end());

const historial = async (productoId) =>
  (await pool.query('select fuente, precio::float, cantidad, municipio_id from historial_precios where producto_id = $1 order by id', [productoId])).rows;

test('publicar y cambiar el precio quedan en el historial; editar sin cambiar el precio no', async () => {
  const datos = { nombre: 'Lulo para historial', categoriaId, precio: 5000, unidad: 'kg', stock: 30, activo: true };
  const { body: p } = await api.post('/api/mis-productos').set('Authorization', `Bearer ${productor}`).send({ ...datos, clienteId: randomUUID() });
  const editar = (cambios) => api.put(`/api/mis-productos/${p.id}`).set('Authorization', `Bearer ${productor}`).send({ ...datos, ...cambios });
  await editar({ stock: 20 });              // mismo precio: no cuenta
  await editar({ precio: 5500 });           // subió
  const h = await historial(p.id);
  assert.deepEqual(h.map((x) => [x.fuente, x.precio]), [['publicado', 5000], ['publicado', 5500]]);
  assert.ok(h[0].municipio_id, 'guarda el municipio de la finca');
});

test('un pedido guarda el precio y la cantidad que se compró', async () => {
  const producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 2);
  const r = await api.post('/api/pedidos').set('Authorization', `Bearer ${comprador}`).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad: 2 }] });
  assert.equal(r.status, 201);
  const ultimo = (await historial(producto.id)).at(-1);
  assert.deepEqual([ultimo.fuente, ultimo.precio, ultimo.cantidad], ['pedido', Number(producto.precio), 2]);
});

test('precio de referencia v2: usa el historial y explica la tendencia', async () => {
  const palabra = `curuba${randomUUID().slice(0, 6).replace(/-/g, '')}`; // única: no se mezcla con corridas anteriores
  const datos = { nombre: `${palabra} de referencia`, categoriaId, precio: 2000, unidad: 'unidad', stock: 50, activo: true };
  const { body: p } = await api.post('/api/mis-productos').set('Authorization', `Bearer ${productor}`).send(datos);
  // Dos precios viejos (hace 3 semanas) y dos recientes más altos
  await pool.query(`update historial_precios set registrado_en = now() - interval '21 days' where producto_id = $1`, [p.id]);
  await pool.query(`insert into historial_precios (producto_id, productor_id, categoria_id, nombre, unidad, precio, fuente, registrado_en)
    select id, productor_id, categoria_id, nombre, unidad, v.precio, v.fuente::fuente_precio, now() - v.hace * interval '1 day'
    from productos, (values (2000, 'pedido', 20), (2400, 'publicado', 5), (2500, 'pedido', 2)) as v(precio, fuente, hace) where id = $1`, [p.id]);
  const r = await api.post('/api/ia/precio').set('Authorization', `Bearer ${productor}`).send({ nombre: palabra, categoriaId, unidad: 'unidad' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.fuente, 'historial');
  assert.ok(r.body.sugerido >= 2000 && r.body.sugerido <= 2500, `sugerido ${r.body.sugerido}`);
  assert.ok(r.body.tendencia > 0);
  assert.match(r.body.explicacion, /subiendo/);
});

test('evaluación del error: solo administradores', async () => {
  assert.equal((await api.get('/api/admin/precios/evaluacion').set('Authorization', `Bearer ${productor}`)).status, 403);
  const admin = (await api.post('/api/auth/login').send({ email: 'admin@demo.co', password: 'Clave1234' })).body.token;
  const r = await api.get('/api/admin/precios/evaluacion').set('Authorization', `Bearer ${admin}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.semanasMinimas, 4);
  assert.equal(typeof r.body.concluyente, 'boolean');
});
