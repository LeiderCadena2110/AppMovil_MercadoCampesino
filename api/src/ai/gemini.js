// Cliente mínimo de la API de Google Gemini (REST, sin SDK).
// La clave se crea gratis en https://aistudio.google.com/apikey y va en GEMINI_API_KEY.
import { env } from '../config/env.js';

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const iaDisponible = () => Boolean(env.geminiApiKey);

/**
 * Pide una respuesta a Gemini.
 * @param {object} opciones
 * @param {string} opciones.sistema   Instrucciones fijas (rol del asistente, reglas, datos del catálogo)
 * @param {{rol: 'usuario'|'ia', texto: string, imagen?: {mime: string, datos: Buffer}}[]} opciones.mensajes
 *        Conversación; un mensaje puede llevar una imagen (visión)
 * @param {object} [opciones.esquema]  Si se envía, la respuesta llega como JSON con esa forma
 * @returns {Promise<string>} texto (o JSON en texto) generado
 */
export async function generar({ sistema, mensajes, esquema, temperatura = 0.6 }) {
  if (!iaDisponible()) throw new Error('IA no configurada');

  const cuerpo = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: mensajes.map((m) => ({
      role: m.rol === 'ia' ? 'model' : 'user',
      parts: [
        ...(m.imagen ? [{ inlineData: { mimeType: m.imagen.mime, data: m.imagen.datos.toString('base64') } }] : []),
        { text: m.texto },
      ],
    })),
    generationConfig: {
      temperature: temperatura,
      maxOutputTokens: 2048,
      ...(esquema ? { responseMimeType: 'application/json', responseSchema: esquema } : {}),
    },
  };

  const contenido = await llamar(cuerpo);
  const texto = contenido.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!texto) throw new Error('Gemini no devolvió texto');
  return texto;
}

/** Igual que generar() pero devuelve el JSON ya interpretado. */
export async function generarJson(opciones) {
  const texto = await generar(opciones);
  return JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ''));
}

/**
 * Conversación con herramientas (function calling): Gemini decide qué herramienta usar, la API
 * la ejecuta con datos reales y le devuelve el resultado, hasta que Gemini responde con texto.
 * @param {object} opciones
 * @param {{nombre: string, descripcion: string, parametros: object, ejecutar: (args: object) => Promise<unknown>}[]} opciones.herramientas
 * @param {number} [opciones.maxPasos]  máximo de rondas de herramientas (evita bucles)
 * @returns {Promise<{ texto: string, usadas: string[], resultados: {nombre: string, resultado: unknown}[] }>}
 */
export async function conversarConHerramientas({ sistema, mensajes, herramientas, temperatura = 0.5, maxPasos = 3 }) {
  if (!iaDisponible()) throw new Error('IA no configurada');
  const porNombre = new Map(herramientas.map((h) => [h.nombre, h]));
  const contenidos = mensajes.map((m) => ({ role: m.rol === 'ia' ? 'model' : 'user', parts: [{ text: m.texto }] }));
  const usadas = [];
  const resultados = [];
  for (let paso = 0; paso <= maxPasos; paso++) {
    const contenido = await llamar({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: contenidos,
      tools: [{ functionDeclarations: herramientas.map((h) => ({ name: h.nombre, description: h.descripcion, parameters: h.parametros })) }],
      generationConfig: { temperature: temperatura, maxOutputTokens: 2048 },
    });
    const llamadas = (contenido.parts ?? []).filter((p) => p.functionCall);
    if (!llamadas.length) {
      const texto = (contenido.parts ?? []).map((p) => p.text ?? '').join('').trim();
      if (!texto) throw new Error('Gemini no devolvió texto');
      return { texto, usadas, resultados };
    }
    if (paso === maxPasos) break;
    contenidos.push({ role: 'model', parts: contenido.parts });
    const respuestas = [];
    for (const { functionCall: { name, args } } of llamadas) {
      const h = porNombre.get(name);
      let resultado;
      try {
        resultado = h ? await h.ejecutar(args ?? {}) : { error: `Herramienta desconocida: ${name}` };
      } catch (e) {
        resultado = { error: e.message };
      }
      usadas.push(name);
      resultados.push({ nombre: name, resultado });
      respuestas.push({ functionResponse: { name, response: { resultado } } });
    }
    contenidos.push({ role: 'user', parts: respuestas });
  }
  throw new Error('Demasiadas llamadas a herramientas');
}

// Cada llamada puede tardar hasta 30 s. Los modelos Gemini 3 "piensan" antes de responder;
// para un asistente de mercado basta con poco razonamiento, y así responden en pocos segundos.
const LIMITE_MS = 30_000;
let razonamientoCorto = true; // se apaga solo si el modelo no acepta thinkingLevel

async function llamar(cuerpo) {
  const conRazonamiento = razonamientoCorto
    ? { ...cuerpo, generationConfig: { ...cuerpo.generationConfig, thinkingConfig: { thinkingLevel: 'low' } } }
    : cuerpo;
  try {
    return await peticion(conRazonamiento);
  } catch (e) {
    if (razonamientoCorto && /400/.test(e.message) && /thinking/i.test(e.message)) {
      razonamientoCorto = false;
      console.warn('[IA] el modelo no acepta thinkingLevel; se usa su configuración por defecto');
      return peticion(cuerpo);
    }
    throw e;
  }
}

async function peticion(cuerpo) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), LIMITE_MS);
  try {
    const r = await fetch(`${URL_BASE}/${env.geminiModelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
    if (!r.ok) throw new Error(`Gemini respondió ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
    const datos = await r.json();
    const contenido = datos?.candidates?.[0]?.content;
    if (!contenido) throw new Error('Gemini no devolvió contenido');
    return contenido;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Gemini tardó más de ${LIMITE_MS / 1000} s en responder`);
    throw e;
  } finally {
    clearTimeout(limite);
  }
}
