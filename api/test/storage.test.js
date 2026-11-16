// En producción sin CLOUDINARY_URL las fotos se rechazan (no se guardan en un disco que se borra).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const probar = (envExtra) => spawnSync(process.execPath, ['--input-type=module', '-e', `
  const m = await import('./src/storage/index.js');
  let error = null;
  try { await m.almacenamiento.subir(Buffer.from('x'), 'prueba-almacen'); } catch (e) { error = e.status; }
  console.log(JSON.stringify({ tipo: m.tipoAlmacenamiento, error }));
`], { env: { ...process.env, CLOUDINARY_URL: '', ...envExtra }, encoding: 'utf8' });

const salida = (r) => JSON.parse(r.stdout.trim().split('\n').pop());

test('en producción sin Cloudinary las subidas responden 503', () => {
  const r = salida(probar({ RENDER: 'true' }));
  assert.deepEqual(r, { tipo: 'sin configurar', error: 503 });
});

test('en desarrollo se usa la carpeta local', () => {
  const r = salida(probar({ RENDER: '', NODE_ENV: 'development' }));
  assert.equal(r.tipo, 'local (solo desarrollo)');
  assert.equal(r.error, null);
});
