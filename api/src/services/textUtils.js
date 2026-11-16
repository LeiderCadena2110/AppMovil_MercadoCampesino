// Utilidades de texto compartidas por la IA y los precios.
/** Quita tildes y pasa a minúsculas para comparar palabras */
export const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PALABRAS_VACIAS = new Set(['de', 'la', 'el', 'los', 'las', 'del', 'para', 'con', 'por', 'una', 'uno', 'un', 'que', 'y', 'o', 'en', 'me', 'mi', 'quiero', 'hay', 'tienes', 'algo', 'como', 'hoy']);
export const palabras = (t) => normalizar(t).split(/[^a-zñ0-9]+/).filter((p) => p.length > 2 && !PALABRAS_VACIAS.has(p));
/** Primera palabra con significado del nombre ("Papa pastusa" → "papa") */
export const palabraClave = (nombre) => palabras(nombre)[0] ?? null;
