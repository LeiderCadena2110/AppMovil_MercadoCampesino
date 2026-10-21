// Prueba de punta a punta: registro → publicar → pedido → estados → calificación.
// Requiere una base con migraciones y seed (npm run db:migrate && npm run db:seed).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
const sufijo = Date.now();
let tokenProd; let tokenComp; let tokenAdmin; let productoId; let pedidoId; let productorId;

after(() => pool.end());

test('salud', async () => {
  const r = await api.get('/api/salud');
  assert.equal(r.status, 200);
});

test('registro de productor y comprador', async () => {
  const municipios = (await api.get('/api/municipios')).body;
  assert.ok(municipios.length > 0);
  let r = await api.post('/api/auth/registro').send({
    rol: 'PRODUCTOR', nombre: 'Productor Prueba', email: `p${sufijo}@t.co`, password: 'Clave1234',
    nombreFinca: 'La Prueba', municipioId: municipios[0].id,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  tokenProd = r.body.token; productorId = r.body.usuario.productor.id;

  r = await api.post('/api/auth/registro').send({ rol: 'COMPRADOR', nombre: 'Comprador Prueba', email: `c${sufijo}@t.co`, password: 'Clave1234' });
  assert.equal(r.status, 201); tokenComp = r.body.token;

  r = await api.post('/api/auth/registro').send({ rol: 'COMPRADOR', nombre: 'Otra persona', email: `c${sufijo}@t.co`, password: 'Clave1234' });
  assert.equal(r.status, 409, 'correo repetido');
});

test('login con datos incorrectos y validación', async () => {
  assert.equal((await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'mala' })).status, 401);
  assert.equal((await api.post('/api/auth/login').send({ email: 'no-es-correo' })).status, 400);
  const r = await api.post('/api/auth/login').send({ email: 'admin@demo.co', password: 'Clave1234' });
  assert.equal(r.status, 200); tokenAdmin = r.body.token;
});

test('el productor publica un producto y sube foto', async () => {
  const cats = (await api.get('/api/categorias')).body;
  let r = await api.post('/api/mis-productos').set('Authorization', `Bearer ${tokenProd}`)
    .send({ nombre: 'Mora de Castilla', categoriaId: cats[0].id, precio: 6000, unidad: 'libra', stock: 10 });
  assert.equal(r.status, 201, JSON.stringify(r.body)); productoId = r.body.id;

  r = await api.post('/api/mis-productos').set('Authorization', `Bearer ${tokenComp}`).send({});
  assert.equal(r.status, 403, 'un comprador no publica');

  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
  r = await api.post(`/api/mis-productos/${productoId}/foto`).set('Authorization', `Bearer ${tokenProd}`)
    .attach('foto', png, { filename: 'mora.png', contentType: 'image/png' });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.match(r.body.fotoUrl, /uploads\/producto-/);
});

test('catálogo paginado con filtros', async () => {
  const r = await api.get('/api/productos?q=mora&pagina=1');
  assert.equal(r.status, 200);
  assert.ok(r.body.items.some((p) => p.id === productoId));
  assert.ok(!('creadoEn' in r.body.items[0]), 'solo columnas de lista');
  assert.equal((await api.get('/api/productos?pagina=0')).status, 400);
  assert.equal((await api.get(`/api/productores/${productorId}`)).status, 200);
});

test('pedido: stock, estados y calificación', async () => {
  const demo = (await api.get('/api/productos?q=papa')).body.items[0];
  let r = await api.post('/api/pedidos').set('Authorization', `Bearer ${tokenComp}`).send({
    direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA',
    items: [{ productoId, cantidad: 3 }, { productoId: demo.id, cantidad: 1 }],
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.length, 2, 'un pedido por productor');
  const mio = r.body.find((p) => p.productorId === productorId);
  pedidoId = mio.id; assert.equal(mio.total, '18000.00');

  r = await api.post('/api/pedidos').set('Authorization', `Bearer ${tokenComp}`).send({
    direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'RECOGIDA', items: [{ productoId, cantidad: 999 }],
  });
  assert.equal(r.status, 409, 'sin stock suficiente');

  const auth = { Authorization: `Bearer ${tokenProd}` };
  assert.equal((await api.patch(`/api/pedidos/${pedidoId}/estado`).set(auth).send({ estado: 'ENTREGADO' })).status, 409);
  for (const estado of ['ACEPTADO', 'LISTO', 'ENTREGADO']) {
    r = await api.patch(`/api/pedidos/${pedidoId}/estado`).set(auth).send({ estado });
    assert.equal(r.status, 200, `${estado}: ${JSON.stringify(r.body)}`);
  }
  r = await api.get(`/api/pedidos/${pedidoId}`).set('Authorization', `Bearer ${tokenComp}`);
  assert.equal(r.body.estado, 'ENTREGADO'); assert.equal(r.body.detalles.length, 1);

  r = await api.post(`/api/pedidos/${pedidoId}/calificacion`).set('Authorization', `Bearer ${tokenComp}`).send({ puntaje: 5 });
  assert.equal(r.status, 201);
  const mis = (await api.get('/api/mis-productos').set(auth)).body;
  assert.equal(mis.find((p) => p.id === productoId).stock, 7);
});

test('rechazar devuelve el stock', async () => {
  let r = await api.post('/api/pedidos').set('Authorization', `Bearer ${tokenComp}`).send({
    direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'RECOGIDA', items: [{ productoId, cantidad: 2 }],
  });
  r = await api.patch(`/api/pedidos/${r.body[0].id}/estado`).set('Authorization', `Bearer ${tokenProd}`).send({ estado: 'RECHAZADO' });
  assert.equal(r.status, 200);
  const mis = (await api.get('/api/mis-productos').set('Authorization', `Bearer ${tokenProd}`)).body;
  assert.equal(mis.find((p) => p.id === productoId).stock, 7);
});

test('administrador oculta un producto y verifica productor', async () => {
  const auth = { Authorization: `Bearer ${tokenAdmin}` };
  let r = await api.get('/api/admin/productores?verificado=false').set(auth);
  assert.ok(r.body.some((p) => p.id === productorId));
  assert.equal((await api.patch(`/api/admin/productores/${productorId}/verificar`).set(auth)).body.verificado, true);
  await api.patch(`/api/admin/productos/${productoId}/ocultar`).set(auth);
  r = await api.get('/api/productos?q=mora');
  assert.ok(!r.body.items.some((p) => p.id === productoId));
  assert.equal((await api.get('/api/admin/productores').set('Authorization', `Bearer ${tokenComp}`)).status, 403);
});
