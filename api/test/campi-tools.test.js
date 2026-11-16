// Campi con herramientas: Gemini (simulado) pide datos, la API los consulta de verdad y se los devuelve.
import { test, after, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { env } from '../src/config/env.js';

const api = request(app);
const fetchReal = globalThis.fetch;
const claveReal = env.geminiApiKey;
let comprador; let productor;
before(async () => {
  comprador = (await api.post('/api/auth/login').send({ email: 'comprador@demo.co', password: 'Clave1234' })).body.token;
  productor = (await api.post('/api/auth/login').send({ email: 'productor@demo.co', password: 'Clave1234' })).body.token;
});
afterEach(() => { globalThis.fetch = fetchReal; env.geminiApiKey = claveReal; });
after(() => pool.end());

/** Simula a Gemini con un guion: cada respuesta es una llamada a herramienta o un texto final */
function simularGemini(guion) {
  env.geminiApiKey = 'prueba';
  const peticiones = [];
  let i = 0;
  globalThis.fetch = async (url, op) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return fetchReal(url, op);
    const cuerpo = JSON.parse(op.body);
    peticiones.push(cuerpo);
    const paso = typeof guion[i] === 'function' ? guion[i](cuerpo) : guion[i];
    i = Math.min(i + 1, guion.length - 1);
    const parts = paso.herramienta ? [{ functionCall: { name: paso.herramienta, args: paso.args ?? {} } }] : [{ text: paso.texto }];
    return Response.json({ candidates: [{ content: { role: 'model', parts } }] });
  };
  return peticiones;
}
const preguntar = (mensaje, token = comprador) => api.post('/api/ia/asistente').set('Authorization', `Bearer ${token}`).send({ mensaje });
const respuestaDe = (cuerpo) => cuerpo.contents.at(-1).parts[0].functionResponse;

test('Campi busca en el catálogo real y solo muestra productos que la herramienta devolvió', async () => {
  let idReal;
  const peticiones = simularGemini([
    { herramienta: 'buscar_productos', args: { texto: 'papa' } },
    (cuerpo) => {
      const r = respuestaDe(cuerpo).response.resultado;
      idReal = r.productos[0].id;
      return { texto: `Hoy hay **${r.productos[0].nombre}**. [[productos: ${idReal}, 999999]]` };
    },
  ]);
  const r = await preguntar('¿Qué papa hay hoy?');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.fuente, 'gemini');
  assert.deepEqual(r.body.productos.map((p) => p.id), [idReal], 'el id inventado (999999) se descarta');
  assert.doesNotMatch(r.body.respuesta, /\[\[/);
  assert.deepEqual(r.body.consultas, ['catálogo de hoy']);
  // Las herramientas se declararon y la respuesta de la herramienta trae datos reales
  assert.deepEqual(peticiones[0].tools[0].functionDeclarations.map((f) => f.name), ['buscar_productos', 'historial_precio', 'mis_pedidos', 'fincas']);
  assert.match(JSON.stringify(respuestaDe(peticiones[1]).response), /papa/i);
});

test('mis_pedidos solo devuelve los pedidos de quien pregunta', async () => {
  const producto = (await api.get('/api/productos')).body.items.find((p) => p.stock >= 1);
  const [pedido] = (await api.post('/api/pedidos').set('Authorization', `Bearer ${comprador}`).set('Idempotency-Key', randomUUID())
    .send({ direccion: 'Calle 18 # 25-30, Pasto', metodoEntrega: 'CONTRA_ENTREGA', items: [{ productoId: producto.id, cantidad: 1 }] })).body;
  let vistos;
  simularGemini([
    { herramienta: 'mis_pedidos', args: { solo_activos: true } },
    (cuerpo) => { vistos = respuestaDe(cuerpo).response.resultado; return { texto: 'Tu pedido va en camino.' }; },
  ]);
  const r = await preguntar('¿Cómo va mi pedido?');
  assert.equal(r.status, 200);
  assert.ok(vistos.pedidos.some((p) => p.id === pedido.id));
  const { rows: [u] } = await pool.query("select id from usuarios where email = 'comprador@demo.co'");
  const { rows } = await pool.query('select id from pedidos where comprador_id = $1', [u.id]);
  const propios = new Set(rows.map((x) => x.id));
  assert.ok(vistos.pedidos.every((p) => propios.has(p.id)));
  assert.deepEqual(r.body.consultas, ['tus pedidos']);

  // Un productor no tiene pedidos de compra: la herramienta responde con un error claro
  let paraProductor;
  simularGemini([{ herramienta: 'mis_pedidos' }, (c) => { paraProductor = respuestaDe(c).response.resultado; return { texto: 'ok' }; }]);
  await preguntar('mis pedidos', productor);
  assert.match(paraProductor.error, /compradores/);
});

test('historial_precio responde con semanas, tendencia y precio esperado', async () => {
  let datos;
  simularGemini([{ herramienta: 'historial_precio', args: { producto: 'papa pastusa' } }, (c) => { datos = respuestaDe(c).response.resultado; return { texto: 'Estable.' }; }]);
  const r = await preguntar('¿La papa está subiendo?');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(datos.semanas) && datos.semanas.length > 0);
  assert.ok('tendenciaPorcentaje' in datos && 'precioEsperado' in datos);
});

test('si Gemini insiste en llamar herramientas sin fin, Campi responde con el respaldo local', async () => {
  simularGemini([{ herramienta: 'fincas' }]);
  const r = await preguntar('Quiero hacer un locro de papa');
  assert.equal(r.status, 200);
  assert.equal(r.body.fuente, 'local');
  assert.ok(r.body.respuesta.length > 0);
});
