// Publicación con IA: foto → producto y dictado de voz → campos del formulario.
// Gemini se simula reemplazando fetch, así las pruebas no necesitan internet ni clave.
import { test, after, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { env } from '../src/config/env.js';
import { interpretarDictado, palabrasANumeros } from '../src/ai/dictation.js';
import { sanearReconocimiento, sanearDictado } from '../src/services/aiService.js';

const api = request(app);
const CATS = [{ id: 1, nombre: 'Frutas' }, { id: 2, nombre: 'Verduras' }, { id: 3, nombre: 'Tubérculos' }, { id: 5, nombre: 'Lácteos' }, { id: 6, nombre: 'Café' }];
// JPEG mínimo válido (1×1 px)
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');

let tokenProd; let tokenComp;
const fetchReal = globalThis.fetch;
const claveReal = env.geminiApiKey;
before(async () => {
  tokenProd = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
  tokenComp = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
});
afterEach(() => { globalThis.fetch = fetchReal; env.geminiApiKey = claveReal; });
after(() => pool.end());

/** Simula a Gemini: guarda la petición y responde con el JSON dado */
function simularGemini(respuesta) {
  const peticiones = [];
  env.geminiApiKey = 'prueba';
  globalThis.fetch = async (url, op) => {
    peticiones.push({ url: String(url), cuerpo: JSON.parse(op.body) });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }), { status: 200 });
  };
  return peticiones;
}

// ---------------------------------------------------------------- intérprete local

test('números en palabras', () => {
  assert.equal(palabrasANumeros('cuarenta y cinco mil'), '45000');
  assert.equal(palabrasANumeros('dos mil quinientos pesos'), '2500 pesos');
  assert.equal(palabrasANumeros('una arroba'), 'una arroba');
  assert.equal(palabrasANumeros('dieciséis libras'), '16 libras');
});

test('entiende dictados típicos de la plaza', () => {
  const casos = [
    ['Papa pastusa a 45 mil la arroba, tengo 40 arrobas', { nombre: 'Papa pastusa', precio: 45000, unidad: 'arroba', stock: 40, categoriaId: 3 }],
    ['Queso campesino doce mil pesos la libra quedan quince', { nombre: 'Queso campesino', precio: 12000, unidad: 'libra', stock: 15, categoriaId: 5 }],
    ['tomate de árbol a $3.500 el kilo, 20 kilos disponibles', { nombre: 'Tomate de árbol', precio: 3500, unidad: 'kg', stock: 20, categoriaId: 1 }],
    ['vendo cebolla junca a dos mil quinientos el atado hay 60', { nombre: 'Cebolla junca', precio: 2500, unidad: 'atado', stock: 60, categoriaId: 2 }],
    ['café especial de Buesaco 28 mil la libra', { nombre: 'Café especial de buesaco', precio: 28000, unidad: 'libra', stock: null, categoriaId: 6 }],
    ['cuarenta y cinco mil la arroba de papa criolla', { nombre: 'Papa criolla', precio: 45000, unidad: 'arroba', stock: null, categoriaId: 3 }],
  ];
  for (const [texto, esperado] of casos) assert.deepEqual(interpretarDictado(texto, CATS), esperado, texto);
});

test('lo que no se dijo queda vacío (no se inventa)', () => {
  assert.deepEqual(interpretarDictado('mora de castilla', CATS), { nombre: 'Mora de castilla', precio: null, unidad: null, stock: null, categoriaId: 1 });
});

// ---------------------------------------------------------------- saneamiento de la IA

test('el reconocimiento descarta categorías y unidades que no existen', () => {
  const r = sanearReconocimiento({ esProducto: true, nombre: 'papa pastusa', categoria: 'Tuberculos', unidad: 'Arroba', descripcion: 'Papa fresca.', confianza: 'alta' }, CATS);
  assert.deepEqual(r, { reconocido: true, nombre: 'Papa pastusa', categoriaId: 3, unidad: 'arroba', descripcion: 'Papa fresca.', confianza: 'alta' });
  const raro = sanearReconocimiento({ esProducto: true, nombre: 'Mango', categoria: 'Exóticos', unidad: 'caja', descripcion: '', confianza: 'segura' }, CATS);
  assert.equal(raro.categoriaId, null);
  assert.equal(raro.unidad, null);
  assert.equal(raro.confianza, 'baja');
  assert.deepEqual(sanearReconocimiento({ esProducto: false }, CATS), { reconocido: false });
});

test('el dictado de la IA se limita a rangos razonables', () => {
  const r = sanearDictado({ nombre: 'papa', precio: -5, unidad: 'quintal', stock: 9_999_999, categoria: 'café' }, CATS);
  assert.deepEqual(r, { nombre: 'Papa', precio: null, unidad: null, stock: null, categoriaId: 6 });
});

// ---------------------------------------------------------------- rutas

test('POST /ia/dictado: solo productores y con texto', async () => {
  assert.equal((await api.post('/api/ia/dictado').send({ texto: 'papa' })).status, 401);
  assert.equal((await api.post('/api/ia/dictado').set('Authorization', `Bearer ${tokenComp}`).send({ texto: 'papa' })).status, 403);
  assert.equal((await api.post('/api/ia/dictado').set('Authorization', `Bearer ${tokenProd}`).send({ texto: '' })).status, 400);
});

test('POST /ia/dictado sin Gemini usa el intérprete local', async () => {
  env.geminiApiKey = '';
  const r = await api.post('/api/ia/dictado').set('Authorization', `Bearer ${tokenProd}`).send({ texto: 'Papa pastusa a 45 mil la arroba, tengo 40' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.fuente, 'local');
  assert.equal(r.body.precio, 45000);
  assert.equal(r.body.unidad, 'arroba');
  assert.equal(r.body.stock, 40);
  assert.ok(r.body.categoriaId > 0);
});

test('POST /ia/dictado con Gemini completa lo que la IA no entendió', async () => {
  simularGemini({ nombre: 'Papa pastusa', precio: 45000, unidad: 'arroba', stock: null, categoria: 'Tubérculos' });
  const r = await api.post('/api/ia/dictado').set('Authorization', `Bearer ${tokenProd}`).send({ texto: 'papa pastusa a 45 mil la arroba tengo 40' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.fuente, 'gemini');
  assert.equal(r.body.stock, 40);
});

test('POST /ia/foto: pide foto y es solo para productores', async () => {
  assert.equal((await api.post('/api/ia/foto').set('Authorization', `Bearer ${tokenComp}`).attach('foto', JPEG, 'a.jpg')).status, 403);
  assert.equal((await api.post('/api/ia/foto').set('Authorization', `Bearer ${tokenProd}`)).status, 400);
});

test('POST /ia/foto sin Gemini responde que no reconoció (el formulario sigue manual)', async () => {
  env.geminiApiKey = '';
  const r = await api.post('/api/ia/foto').set('Authorization', `Bearer ${tokenProd}`).attach('foto', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { reconocido: false, fuente: 'local' });
});

test('POST /ia/foto con Gemini envía la imagen y devuelve campos válidos', async () => {
  const peticiones = simularGemini({ esProducto: true, nombre: 'Tomate de árbol', categoria: 'Frutas', unidad: 'kg', descripcion: 'Tomates de árbol maduros, de color rojo intenso.', confianza: 'alta' });
  const r = await api.post('/api/ia/foto').set('Authorization', `Bearer ${tokenProd}`).attach('foto', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.reconocido, true);
  assert.equal(r.body.nombre, 'Tomate de árbol');
  assert.equal(r.body.unidad, 'kg');
  assert.ok(r.body.categoriaId > 0);
  const partes = peticiones[0].cuerpo.contents[0].parts;
  assert.equal(partes[0].inlineData.mimeType, 'image/jpeg');
  assert.equal(partes[0].inlineData.data, JPEG.toString('base64'));
});

test('POST /ia/foto: si Gemini falla, no rompe la publicación', async () => {
  env.geminiApiKey = 'prueba';
  globalThis.fetch = async () => new Response('caído', { status: 503 });
  const r = await api.post('/api/ia/foto').set('Authorization', `Bearer ${tokenProd}`).attach('foto', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' });
  assert.equal(r.status, 200);
  assert.equal(r.body.reconocido, false);
});
