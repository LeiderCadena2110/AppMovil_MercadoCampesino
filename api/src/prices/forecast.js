// Predicción de precios v2: funciones puras sobre el historial (sin base de datos), fáciles de probar.
//
// Idea: el precio de la próxima semana se parece al de las últimas semanas, pesando más
//  - lo reciente (vida media de 14 días) y
//  - lo que de verdad se compró (los pedidos pesan el doble que un precio solo publicado).
// Se usa la mediana ponderada (resiste precios atípicos) y se informa la tendencia.
//
// Evaluación (backtest): para cada semana con datos se predice usando SOLO lo anterior a esa
// semana y se compara con la mediana real de la semana. El error es el MAPE (error porcentual
// absoluto medio). Se compara contra un modelo ingenuo ("el último precio visto") para saber si
// el modelo aporta algo. Con menos de 4 semanas evaluadas el resultado no es concluyente.

const DIA = 86_400_000;
const SEMANA = 7 * DIA;
const VIDA_MEDIA_DIAS = 14;
const VENTANA_DIAS = 28;
export const SEMANAS_MINIMAS = 4;

/** @typedef {{ precio: number, fecha: Date, fuente: 'publicado' | 'pedido', cantidad?: number | null }} Observacion */

const peso = (o) => (o.fuente === 'pedido' ? 2 : 1);

/** Mediana ponderada: el valor donde se acumula la mitad del peso */
export function medianaPonderada(pares) {
  const v = pares.filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]);
  if (!v.length) return null;
  const total = v.reduce((s, [, w]) => s + w, 0);
  let acumulado = 0;
  for (const [x, w] of v) {
    acumulado += w;
    if (acumulado >= total / 2) return x;
  }
  return v.at(-1)[0];
}

function cuantilPonderado(pares, q) {
  const v = [...pares].sort((a, b) => a[0] - b[0]);
  const total = v.reduce((s, [, w]) => s + w, 0);
  let acumulado = 0;
  for (const [x, w] of v) {
    acumulado += w;
    if (acumulado >= total * q) return x;
  }
  return v.at(-1)?.[0] ?? null;
}

const centena = (n) => (n == null ? null : Math.round(n / 100) * 100); // precios de plaza: a la centena

/**
 * Predice el precio para la fecha dada con las observaciones anteriores a ella.
 * @param {Observacion[]} obs
 * @returns {{ predicho: number|null, minimo: number|null, maximo: number|null, tendencia: number|null, muestras: number }}
 */
export function predecir(obs, fecha = new Date()) {
  const t = fecha.getTime();
  const ventana = obs.filter((o) => o.fecha.getTime() < t && t - o.fecha.getTime() <= VENTANA_DIAS * DIA);
  if (!ventana.length) return { predicho: null, minimo: null, maximo: null, tendencia: null, muestras: 0 };
  const pares = ventana.map((o) => [o.precio, peso(o) * 0.5 ** ((t - o.fecha.getTime()) / DIA / VIDA_MEDIA_DIAS)]);
  // Tendencia: mediana de las últimas 2 semanas frente a las 2 anteriores
  const reciente = ventana.filter((o) => t - o.fecha.getTime() <= 14 * DIA).map((o) => [o.precio, peso(o)]);
  const anterior = ventana.filter((o) => t - o.fecha.getTime() > 14 * DIA).map((o) => [o.precio, peso(o)]);
  const mr = medianaPonderada(reciente);
  const ma = medianaPonderada(anterior);
  return {
    predicho: centena(medianaPonderada(pares)),
    minimo: centena(cuantilPonderado(pares, 0.25)),
    maximo: centena(cuantilPonderado(pares, 0.75)),
    tendencia: mr && ma ? Math.round(((mr - ma) / ma) * 1000) / 10 : null, // % con un decimal
    muestras: ventana.length,
  };
}

/** Lunes 00:00 (hora de Colombia) de la semana de esa fecha */
export function inicioSemana(fecha) {
  const bogota = new Date(fecha.getTime() - 5 * 3600_000);
  const dia = (bogota.getUTCDay() + 6) % 7; // lunes = 0
  const lunes = Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() - dia);
  return new Date(lunes + 5 * 3600_000);
}

/**
 * Backtest semanal de una serie (mismo producto/categoría y unidad).
 * @returns {{ semanasConDatos: number, evaluaciones: {semana: string, real: number, predicho: number, ingenuo: number}[] }}
 */
export function evaluarSerie(obs) {
  const orden = [...obs].sort((a, b) => a.fecha - b.fecha);
  const semanas = new Map();
  for (const o of orden) {
    const k = inicioSemana(o.fecha).getTime();
    semanas.set(k, [...(semanas.get(k) ?? []), o]);
  }
  const evaluaciones = [];
  for (const [inicio, deLaSemana] of semanas) {
    const previas = orden.filter((o) => o.fecha.getTime() < inicio);
    if (!previas.length) continue;
    const { predicho } = predecir(previas, new Date(inicio));
    if (predicho == null) continue; // sin datos en las 4 semanas anteriores
    const real = medianaPonderada(deLaSemana.map((o) => [o.precio, peso(o)]));
    evaluaciones.push({ semana: new Date(inicio).toISOString().slice(0, 10), real, predicho, ingenuo: previas.at(-1).precio });
  }
  return { semanasConDatos: semanas.size, evaluaciones };
}

/** Resume varias series: MAPE del modelo y del modelo ingenuo, y si ya es concluyente */
export function resumirEvaluacion(series) {
  const todas = series.flatMap((s) => s.evaluaciones);
  const mape = (campo) => (todas.length
    ? Math.round((todas.reduce((s, e) => s + Math.abs(e[campo] - e.real) / e.real, 0) / todas.length) * 1000) / 10
    : null);
  const semanasEvaluadas = new Set(todas.map((e) => e.semana)).size;
  return {
    semanasEvaluadas,
    evaluaciones: todas.length,
    mape: mape('predicho'),
    mapeIngenuo: mape('ingenuo'),
    concluyente: semanasEvaluadas >= SEMANAS_MINIMAS,
  };
}
