// Predicción v2: funciones puras con datos inventados y controlados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medianaPonderada, predecir, inicioSemana, evaluarSerie, resumirEvaluacion } from '../src/prices/forecast.js';

const dia = (n) => new Date(Date.UTC(2026, 9, 5 + n, 17)); // 5 oct 2026 (lunes) + n días, mediodía en Colombia
const obs = (n, precio, fuente = 'publicado') => ({ fecha: dia(n), precio, fuente });

test('mediana ponderada', () => {
  assert.equal(medianaPonderada([[1000, 1], [2000, 1], [9000, 1]]), 2000);
  assert.equal(medianaPonderada([[1000, 1], [2000, 3]]), 2000);
  assert.equal(medianaPonderada([]), null);
});

test('predice con lo reciente, resiste un precio atípico y detecta la tendencia', () => {
  const datos = [obs(0, 40000), obs(3, 40000), obs(8, 41000), obs(15, 44000), obs(18, 45000, 'pedido'), obs(20, 90000), obs(22, 46000)];
  const r = predecir(datos, dia(28));
  assert.ok(r.predicho >= 44000 && r.predicho <= 46000, `predicho ${r.predicho}`);
  assert.ok(r.tendencia > 5, `tendencia ${r.tendencia}`);
  assert.equal(r.predicho % 100, 0);
  assert.equal(r.muestras, 7);
});

test('no usa datos del futuro ni de hace más de 4 semanas', () => {
  assert.equal(predecir([obs(0, 1000)], dia(40)).predicho, null);
  assert.equal(predecir([obs(10, 1000)], dia(5)).predicho, null);
});

test('las semanas empiezan el lunes en hora de Colombia', () => {
  assert.equal(inicioSemana(dia(2)).toISOString(), '2026-10-05T05:00:00.000Z');
  assert.equal(inicioSemana(new Date('2026-10-12T04:30:00Z')).toISOString(), '2026-10-05T05:00:00.000Z'); // domingo 11:30 p. m.
});

test('backtest: con precios estables el error es bajo y no es concluyente antes de 4 semanas', () => {
  const estables = Array.from({ length: 6 }, (_, s) => [obs(s * 7 + 1, 3000), obs(s * 7 + 4, 3100)]).flat();
  const serie = evaluarSerie(estables);
  assert.equal(serie.semanasConDatos, 6);
  const r = resumirEvaluacion([serie]);
  assert.equal(r.semanasEvaluadas, 5);
  assert.ok(r.concluyente);
  assert.ok(r.mape < 5, `MAPE ${r.mape}`);
  const corta = resumirEvaluacion([evaluarSerie(estables.slice(0, 4))]);
  assert.equal(corta.concluyente, false);
});
