// Límite de intentos de login (proceso propio: el contador vive en memoria).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';

const api = request(app);
after(() => pool.end());

test('tras 8 contraseñas incorrectas el login responde 429, aun con la correcta', async () => {
  for (let i = 0; i < 8; i++) {
    const r = await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: `mala-${i}` });
    assert.equal(r.status, 401);
  }
  const bloqueado = await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' });
  assert.equal(bloqueado.status, 429);
  assert.match(bloqueado.body.error, /Demasiados intentos/);
});

test('el bloqueo es por correo: otra cuenta desde la misma IP sigue entrando', async () => {
  const r = await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' });
  assert.equal(r.status, 200);
});
