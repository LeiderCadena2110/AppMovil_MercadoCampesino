// Mide el error de la predicción de precios con el historial guardado.
// Uso: npm run precios:evaluar   (con DATABASE_URL de la base que se quiera medir)
import { pool } from '../src/db/index.js';
import { precioService } from '../src/services/priceService.js';

const r = await precioService.evaluar();
console.log(`Historial: ${r.registros} precios desde ${r.desde ?? '—'}`);
console.log(`Semanas evaluadas: ${r.semanasEvaluadas} (se necesitan ${r.semanasMinimas}) · ${r.evaluaciones} predicciones`);
if (r.mape == null) console.log('Aún no hay semanas con datos de la semana anterior para comparar.');
else {
  console.log(`Error del modelo (MAPE): ${r.mape} %`);
  console.log(`Error de "repetir el último precio": ${r.mapeIngenuo} %`);
  console.log(r.mape <= r.mapeIngenuo ? 'El modelo mejora o iguala al método ingenuo.' : 'El modelo aún no supera al método ingenuo.');
  console.log(r.concluyente ? 'Resultado concluyente (4 semanas o más).' : 'Resultado preliminar: faltan semanas de datos.');
  console.table(r.series.slice(0, 15));
}
await pool.end();
