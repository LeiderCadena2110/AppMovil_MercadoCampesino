// Respaldo de Campi sin Gemini: entiende las preguntas más comunes y responde con las mismas
// herramientas de datos reales que usa Gemini (pedidos, historial de precios, fincas).
// Si la pregunta no es de esos temas, se usa la búsqueda en el catálogo de siempre.
import { herramientasCampi, NOMBRE_CONSULTA } from './campiTools.js';
import { normalizar, palabras } from '../services/textUtils.js';

const pesos = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;
const ESTADO = {
  PENDIENTE: 'recibido, esperando que la finca lo confirme', ACEPTADO: 'confirmado: la finca lo está preparando',
  LISTO: 'listo para entregar', ENTREGADO: 'entregado', RECHAZADO: 'rechazado por la finca',
};
// Palabras que no son el nombre de un producto en preguntas de precio
const NO_PRODUCTO = new Set(['esta', 'estan', 'subiendo', 'bajando', 'precio', 'precios', 'cuanto', 'vale', 'cuesta', 'caro', 'cara',
  'barato', 'barata', 'tendencia', 'semana', 'semanas', 'subio', 'bajo', 'sube', 'baja', 'ahora', 'cara', 'mas', 'menos', 'normal']);

export const intencion = (mensaje) => {
  const t = normalizar(mensaje);
  if (/\b(mi|mis)\b.*\b(pedido|pedidos|compra|compras|orden)\b|\bpedido\b.*\b(va|llega|esta|estado)\b|\b(llega|entregan)\b/.test(t)) return 'pedidos';
  if (/\b(subiendo|bajando|subio|bajo|sube|baja|tendencia|caro|cara|barat[oa]|precio|precios|cuanto (vale|cuesta|esta))\b/.test(t)) return 'precio';
  if (/\b(finca|fincas|productor|productores|campesino|campesinos)\b/.test(t)) return 'fincas';
  return null;
};

/** Devuelve { respuesta, consultas } o null si la pregunta no es de estos temas */
export async function respuestaLocal(mensaje, usuario) {
  const tipo = intencion(mensaje);
  if (!tipo) return null;
  const h = Object.fromEntries(herramientasCampi(usuario).map((x) => [x.nombre, x]));

  if (tipo === 'pedidos') {
    const r = await h.mis_pedidos.ejecutar({});
    const consultas = [NOMBRE_CONSULTA.mis_pedidos];
    if (r.error) return { respuesta: 'Los pedidos de compra los ves con una cuenta de comprador. En la pestaña Pedidos están los que te hacen a ti.', consultas };
    if (!r.pedidos.length) return { respuesta: 'Todavía no tienes pedidos. Cuando compres algo, aquí te cuento cómo va.', consultas };
    const activos = r.pedidos.filter((p) => !['ENTREGADO', 'RECHAZADO'].includes(p.estado));
    const lista = (activos.length ? activos : r.pedidos.slice(0, 1)).slice(0, 3).map((p) => {
      const pago = p.pago === 'PENDIENTE' ? ' (falta el pago en línea)' : p.pago === 'RECHAZADO' ? ' (el pago no se aprobó)' : '';
      return `el pedido **#${p.id}** de ${p.finca} (${pesos(p.total)}) está ${ESTADO[p.estado] ?? p.estado}${pago}`;
    });
    const intro = activos.length ? (activos.length === 1 ? 'Tienes un pedido en curso: ' : `Tienes ${activos.length} pedidos en curso: `) : 'No tienes pedidos en curso. El último: ';
    return { respuesta: `${intro}${lista.join('; ')}. Puedes ver el detalle en la pestaña Pedidos.`, consultas };
  }

  if (tipo === 'precio') {
    const producto = palabras(mensaje).filter((p) => !NO_PRODUCTO.has(p)).join(' ');
    if (!producto) return null;
    const r = await h.historial_precio.ejecutar({ producto });
    const consultas = [NOMBRE_CONSULTA.historial_precio];
    if (!r.semanas?.length) return { respuesta: `Todavía no tengo historial de precios de ${producto}. Mira lo que hay hoy en Inicio.`, consultas };
    const nombre = producto.charAt(0).toUpperCase() + producto.slice(1);
    let texto = `**${nombre}** por ${r.unidad}: `;
    if (r.tendenciaPorcentaje != null && Math.abs(r.tendenciaPorcentaje) >= 3) {
      texto += `viene ${r.tendenciaPorcentaje > 0 ? 'subiendo' : 'bajando'} ${Math.abs(r.tendenciaPorcentaje).toLocaleString('es-CO')} % frente a hace dos semanas.`;
    } else if (r.tendenciaPorcentaje != null) {
      texto += 'el precio está estable en las últimas semanas.';
    } else {
      texto += `aún hay pocos datos para ver si sube o baja (${r.semanas.length} ${r.semanas.length === 1 ? 'semana' : 'semanas'}).`;
    }
    if (r.precioEsperado) {
      texto += r.rangoUsual?.[0] && r.rangoUsual[0] !== r.rangoUsual[1]
        ? ` Lo usual es entre ${pesos(r.rangoUsual[0])} y ${pesos(r.rangoUsual[1])}; esta semana se espera alrededor de ${pesos(r.precioEsperado)}.`
        : ` Esta semana se espera alrededor de ${pesos(r.precioEsperado)}.`;
    }
    return { respuesta: texto, consultas };
  }

  const r = await h.fincas.ejecutar({});
  const consultas = [NOMBRE_CONSULTA.fincas];
  if (!r.fincas.length) return { respuesta: 'Todavía no hay fincas con cosecha a la venta.', consultas };
  const lista = r.fincas.slice(0, 4).map((f) => `**${f.nombreFinca}** (${f.municipio}${f.verificado ? ', verificada' : ''}): ${f.categorias.slice(0, 3).join(', ').toLowerCase()}`);
  return { respuesta: `Hoy venden ${r.fincas.length === 1 ? 'esta finca' : `${r.fincas.length} fincas`}: ${lista.join('; ')}. Míralas en el mapa desde Inicio.`, consultas };
}
