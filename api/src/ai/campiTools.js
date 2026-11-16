// Herramientas de Campi: consultas de solo lectura a datos reales de Minga App.
// Cada herramienta recibe el usuario que pregunta: "mis_pedidos" solo ve los pedidos de esa persona.
import { and, desc, eq, gte, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { historialPrecios, pedidos } from '../db/schema.js';
import { productoRepository } from '../repositories/productRepository.js';
import { mapaService } from '../services/mapService.js';
import { predecir, medianaPonderada, inicioSemana } from '../prices/forecast.js';
import { normalizar, palabras } from '../services/textUtils.js';

const texto = (tipo = 'STRING', descripcion) => ({ type: tipo, description: descripcion });

export function herramientasCampi(usuario) {
  return [
    {
      nombre: 'buscar_productos',
      descripcion: 'Busca productos a la venta hoy en Minga App. Devuelve id, nombre, precio, unidad, existencias, finca y municipio.',
      parametros: {
        type: 'OBJECT',
        properties: {
          texto: texto('STRING', 'Palabras del producto, p. ej. "papa" o "queso campesino". Vacío = todo.'),
          categoria: texto('STRING', 'Frutas, Verduras, Tubérculos, Granos, Lácteos, Café o Hierbas'),
          precio_maximo: texto('NUMBER', 'Precio máximo por unidad, en pesos'),
          municipio: texto('STRING', 'Municipio de Nariño de la finca'),
        },
      },
      async ejecutar({ texto: q = '', categoria, precio_maximo: max, municipio }) {
        const pide = palabras(q);
        const lista = (await productoRepository.paraIa(200)).filter((p) => {
          const nombre = normalizar(`${p.nombre} ${p.categoria}`);
          return (!pide.length || pide.some((w) => nombre.includes(w) || nombre.includes(w.replace(/s$/, ''))))
            && (!categoria || normalizar(p.categoria) === normalizar(categoria))
            && (!max || Number(p.precio) <= Number(max))
            && (!municipio || normalizar(p.municipio) === normalizar(municipio));
        });
        return {
          total: lista.length,
          productos: lista.slice(0, 8).map((p) => ({ id: p.id, nombre: p.nombre, precio: Number(p.precio), unidad: p.unidad, existencias: p.stock,
            categoria: p.categoria, finca: p.finca, municipio: p.municipio, verificada: p.verificado })),
        };
      },
    },
    {
      nombre: 'historial_precio',
      descripcion: 'Cómo ha cambiado el precio de un producto en Minga App en las últimas 8 semanas (precios publicados y pedidos), su tendencia y el precio esperado para la próxima semana.',
      parametros: {
        type: 'OBJECT',
        properties: { producto: texto('STRING', 'Nombre del producto, p. ej. "papa pastusa"'), unidad: texto('STRING', 'kg, libra, arroba, unidad, bulto, atado o litro') },
        required: ['producto'],
      },
      async ejecutar({ producto, unidad }) {
        const palabra = palabras(producto)[0];
        if (!palabra) return { error: 'Dime el nombre del producto' };
        const desde = new Date(Date.now() - 56 * 86_400_000);
        const filtros = [ilike(historialPrecios.nombre, `%${palabra}%`), gte(historialPrecios.registradoEn, desde)];
        if (unidad) filtros.push(eq(historialPrecios.unidad, unidad));
        const filas = await db.select().from(historialPrecios).where(and(...filtros));
        if (!filas.length) return { producto, semanas: [], mensaje: 'Todavía no hay historial de este producto' };
        // Una serie por unidad: se usa la que tiene más datos
        const porUnidad = Object.groupBy(filas, (f) => f.unidad);
        const [u, serie] = Object.entries(porUnidad).sort((a, b) => b[1].length - a[1].length)[0];
        const obs = serie.map((f) => ({ precio: Number(f.precio), fecha: f.registradoEn, fuente: f.fuente }));
        const semanas = Object.entries(Object.groupBy(obs, (o) => inicioSemana(o.fecha).toISOString().slice(0, 10)))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([semana, os]) => ({ semana, precio: medianaPonderada(os.map((o) => [o.precio, o.fuente === 'pedido' ? 2 : 1])) }));
        const p = predecir(obs, new Date());
        return { producto, unidad: u, semanas, tendenciaPorcentaje: p.tendencia, precioEsperado: p.predicho, rangoUsual: [p.minimo, p.maximo] };
      },
    },
    {
      nombre: 'mis_pedidos',
      descripcion: 'Los pedidos recientes de la persona que pregunta (estado, finca, total y productos). Úsala si pregunta por sus pedidos o compras.',
      parametros: { type: 'OBJECT', properties: { solo_activos: texto('BOOLEAN', 'true = solo los que aún no se entregan') } },
      async ejecutar({ solo_activos: activos }) {
        if (usuario?.rol !== 'COMPRADOR') return { error: 'Solo los compradores tienen pedidos de compra' };
        const lista = await db.query.pedidos.findMany({
          where: eq(pedidos.compradorId, usuario.id),
          orderBy: [desc(pedidos.creadoEn)],
          limit: 10,
          with: { productor: { columns: { nombreFinca: true } }, detalles: { with: { producto: { columns: { nombre: true } } } } },
        });
        return {
          pedidos: lista.filter((p) => !activos || !['ENTREGADO', 'RECHAZADO'].includes(p.estado)).slice(0, 5).map((p) => ({
            id: p.id, estado: p.estado, pago: p.pagoEstado, finca: p.productor.nombreFinca, total: Number(p.total),
            fecha: p.creadoEn.toISOString().slice(0, 10), productos: p.detalles.map((d) => `${d.cantidad} × ${d.producto.nombre}`),
          })),
        };
      },
    },
    {
      nombre: 'fincas',
      descripcion: 'Fincas con cosecha a la venta: nombre, municipio, si está verificada, cuántos productos tiene y de qué categorías.',
      parametros: { type: 'OBJECT', properties: { municipio: texto('STRING', 'Municipio de Nariño (opcional)') } },
      async ejecutar({ municipio }) {
        const lista = await mapaService.fincas();
        return {
          fincas: lista.filter((f) => !municipio || normalizar(f.municipio) === normalizar(municipio)).slice(0, 10)
            .map(({ id, nombreFinca, municipio: m, verificado, productos, categorias }) => ({ id, nombreFinca, municipio: m, verificado, productos, categorias })),
        };
      },
    },
  ];
}

/** Nombre para mostrar en la app de lo que consultó Campi */
export const NOMBRE_CONSULTA = {
  buscar_productos: 'catálogo de hoy', historial_precio: 'historial de precios', mis_pedidos: 'tus pedidos', fincas: 'fincas',
};
