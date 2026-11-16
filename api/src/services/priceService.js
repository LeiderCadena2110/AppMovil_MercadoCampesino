// Precios: referencia para el productor (predicción v2) y evaluación del error del modelo.
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { historialPrecios } from '../db/schema.js';
import { predecir, evaluarSerie, resumirEvaluacion, SEMANAS_MINIMAS } from '../prices/forecast.js';
import { normalizar, palabraClave } from './textUtils.js';

const pesos = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;
const aObservacion = (f) => ({ precio: Number(f.precio), fecha: f.registradoEn, fuente: f.fuente, cantidad: f.cantidad });

export const precioService = {
  /**
   * Precio de referencia con el historial de las últimas 4 semanas: primero de productos con el
   * mismo nombre (p. ej. "papa"); si hay pocos, de toda la categoría con esa unidad.
   * Devuelve null si no hay historial suficiente (la API usa entonces el catálogo actual).
   */
  async referencia({ nombre, categoriaId, unidad }, ahora = new Date()) {
    const desde = new Date(ahora.getTime() - 28 * 86_400_000);
    const filas = await db.select().from(historialPrecios)
      .where(and(eq(historialPrecios.categoriaId, categoriaId), eq(historialPrecios.unidad, unidad), gte(historialPrecios.registradoEn, desde)));
    if (!filas.length) return null;
    const palabra = palabraClave(nombre);
    const mismoNombre = palabra ? filas.filter((f) => normalizar(f.nombre).includes(palabra)) : [];
    const usadas = mismoNombre.length >= 2 ? mismoNombre : filas;
    const r = predecir(usadas.map(aObservacion), ahora);
    if (r.predicho == null) return null;
    const pedidos = usadas.filter((f) => f.fuente === 'pedido').length;
    const base = mismoNombre.length >= 2 ? `"${palabra}"` : 'productos de la misma categoría';
    let explicacion = `Según ${usadas.length} precios de ${base} por ${unidad} en las últimas 4 semanas`
      + `${pedidos ? ` (${pedidos} de pedidos reales)` : ''}, lo usual está entre ${pesos(r.minimo)} y ${pesos(r.maximo)}. Sugerido: ${pesos(r.predicho)}.`;
    if (r.tendencia != null && Math.abs(r.tendencia) >= 3) {
      explicacion += ` Viene ${r.tendencia > 0 ? 'subiendo' : 'bajando'} ${Math.abs(r.tendencia).toLocaleString('es-CO')} % frente a las dos semanas anteriores.`;
    }
    return { sugerido: r.predicho, minimo: r.minimo, maximo: r.maximo, muestras: usadas.length, tendencia: r.tendencia, explicacion, fuente: 'historial' };
  },

  /**
   * Error del modelo con todo el historial (backtest semanal por serie categoría + unidad + nombre).
   * Solo cuenta lo que de verdad se pidió: es lo que el modelo debe acertar.
   */
  async evaluar() {
    const filas = await db.select().from(historialPrecios);
    const series = new Map();
    for (const f of filas) {
      const k = `${f.categoriaId}|${f.unidad}|${palabraClave(f.nombre) ?? ''}`;
      series.set(k, [...(series.get(k) ?? []), f]);
    }
    const evaluadas = [...series.entries()].map(([clave, fs]) => ({ clave, ...evaluarSerie(fs.map(aObservacion)) }));
    const resumen = resumirEvaluacion(evaluadas);
    const fechas = filas.map((f) => f.registradoEn.getTime());
    return {
      ...resumen,
      semanasMinimas: SEMANAS_MINIMAS,
      registros: filas.length,
      desde: fechas.length ? new Date(Math.min(...fechas)).toISOString().slice(0, 10) : null,
      series: evaluadas.filter((s) => s.evaluaciones.length).map((s) => ({ clave: s.clave, semanas: s.evaluaciones.length,
        mape: resumirEvaluacion([s]).mape })),
    };
  },
};
