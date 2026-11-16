// Sesiones: token de acceso corto + refresh token rotativo, cierre de sesión y detección de reuso.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
after(() => pool.end());
const entrar = () => api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' });

test('el login entrega token de acceso corto y refresh token', async () => {
  const r = await entrar();
  assert.equal(r.status, 200);
  assert.ok(r.body.refreshToken?.length >= 40);
  const { exp, iat } = jwt.decode(r.body.token);
  assert.ok(exp - iat <= 15 * 60, 'el token de acceso dura 15 minutos o menos');
});

test('refresh rota el token: el nuevo sirve y el viejo ya no', async () => {
  const { refreshToken } = (await entrar()).body;
  const r1 = await api.post('/api/auth/refresh').send({ refreshToken });
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  assert.notEqual(r1.body.refreshToken, refreshToken);
  assert.equal(r1.body.usuario.email, 'comprador@demo.co');
  const yo = await api.get('/api/auth/yo').set('Authorization', `Bearer ${r1.body.token}`);
  assert.equal(yo.status, 200);
  const r2 = await api.post('/api/auth/refresh').send({ refreshToken: r1.body.refreshToken });
  assert.equal(r2.status, 200);
});

test('reusar un refresh ya rotado cierra todas las sesiones del usuario', async () => {
  const { refreshToken: viejo } = (await entrar()).body;
  const otra = (await entrar()).body.refreshToken; // otra sesión del mismo usuario
  const rotado = (await api.post('/api/auth/refresh').send({ refreshToken: viejo })).body.refreshToken;
  const robo = await api.post('/api/auth/refresh').send({ refreshToken: viejo });
  assert.equal(robo.status, 401);
  assert.match(robo.body.error, /seguridad/);
  assert.equal((await api.post('/api/auth/refresh').send({ refreshToken: rotado })).status, 401);
  assert.equal((await api.post('/api/auth/refresh').send({ refreshToken: otra })).status, 401);
});

test('cerrar sesión revoca el refresh token', async () => {
  const { refreshToken } = (await entrar()).body;
  assert.equal((await api.post('/api/auth/logout').send({ refreshToken })).status, 204);
  assert.equal((await api.post('/api/auth/refresh').send({ refreshToken })).status, 401);
});

test('un refresh inventado se rechaza', async () => {
  const r = await api.post('/api/auth/refresh').send({ refreshToken: 'x'.repeat(43) });
  assert.equal(r.status, 401);
});
