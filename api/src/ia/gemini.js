// Cliente mínimo de la API de Google Gemini (REST, sin SDK).
// La clave se crea gratis en https://aistudio.google.com/apikey y va en GEMINI_API_KEY.
import { env } from '../config/env.js';

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const iaDisponible = () => Boolean(env.geminiApiKey);

/**
 * Pide una respuesta a Gemini.
 * @param {object} opciones
 * @param {string} opciones.sistema   Instrucciones fijas (rol del asistente, reglas, datos del catálogo)
 * @param {{rol: 'usuario'|'ia', texto: string}[]} opciones.mensajes  Conversación
 * @param {object} [opciones.esquema]  Si se envía, la respuesta llega como JSON con esa forma
 * @returns {Promise<string>} texto (o JSON en texto) generado
 */
export async function generar({ sistema, mensajes, esquema, temperatura = 0.6 }) {
  if (!iaDisponible()) throw new Error('IA no configurada');

  const cuerpo = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: mensajes.map((m) => ({ role: m.rol === 'ia' ? 'model' : 'user', parts: [{ text: m.texto }] })),
    generationConfig: {
      temperature: temperatura,
      maxOutputTokens: 1024,
      ...(esquema ? { responseMimeType: 'application/json', responseSchema: esquema } : {}),
    },
  };

  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 20_000);
  try {
    const r = await fetch(`${URL_BASE}/${env.geminiModelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
    if (!r.ok) {
      const detalle = await r.text().catch(() => '');
      throw new Error(`Gemini respondió ${r.status}: ${detalle.slice(0, 200)}`);
    }
    const datos = await r.json();
    const texto = datos?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!texto) throw new Error('Gemini no devolvió texto');
    return texto;
  } finally {
    clearTimeout(limite);
  }
}

/** Igual que generar() pero devuelve el JSON ya interpretado. */
export async function generarJson(opciones) {
  const texto = await generar(opciones);
  return JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ''));
}
