// Mapa de fincas. La ubicación exacta de una finca es privada: al público se muestra
// redondeada a 2 decimales (~1 km). Si la finca no marcó su punto, se usa el municipio
// con un pequeño desplazamiento fijo por productor para que los marcadores no se tapen.
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productores, productos, municipios, categorias } from '../db/schema.js';
import { ErrorApp } from '../middlewares/errors.js';
import { NARINO } from '../db/municipalities.js';

const redondear = (n) => Math.round(n * 100) / 100;

/** Desplazamiento determinista (≈ hasta 2 km) para separar fincas del mismo municipio */
function desplazar(id) {
  const angulo = (id * 137.508 * Math.PI) / 180; // ángulo dorado: se reparten alrededor
  const radio = 0.006 + ((id * 7919) % 10) * 0.0012;
  return [Math.sin(angulo) * radio, Math.cos(angulo) * radio];
}

/** Ubicación pública de un productor: { lat, lng, precision: 'finca' | 'municipio' } o null */
export function ubicacionPublica({ id, lat, lng }, municipio) {
  if (lat != null && lng != null) return { lat: redondear(lat), lng: redondear(lng), precision: 'finca' };
  if (municipio?.lat == null) return null;
  const [dLat, dLng] = desplazar(id);
  return { lat: municipio.lat + dLat, lng: municipio.lng + dLng, precision: 'municipio' };
}

export const mapaService = {
  /** Fincas con al menos un producto a la venta, con su ubicación pública */
  async fincas() {
    const filas = await db.select({
      id: productores.id, nombreFinca: productores.nombreFinca, verificado: productores.verificado,
      lat: productores.lat, lng: productores.lng,
      municipio: municipios.nombre, municipioLat: municipios.lat, municipioLng: municipios.lng,
      productos: sql`count(${productos.id})::int`,
      categorias: sql`array_agg(distinct ${categorias.nombre})`,
    })
      .from(productores)
      .innerJoin(municipios, eq(productores.municipioId, municipios.id))
      .innerJoin(productos, and(eq(productos.productorId, productores.id), eq(productos.activo, true), eq(productos.oculto, false), sql`${productos.stock} > 0`))
      .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
      .groupBy(productores.id, municipios.id);
    return filas.flatMap((f) => {
      const ubicacion = ubicacionPublica(f, { lat: f.municipioLat, lng: f.municipioLng });
      if (!ubicacion) return [];
      return [{ id: f.id, nombreFinca: f.nombreFinca, verificado: f.verificado, municipio: f.municipio,
        productos: f.productos, categorias: f.categorias, ...ubicacion }];
    });
  },

  /** El productor marca (o borra, con null) el punto de su finca */
  async fijarUbicacion(productorId, ubicacion) {
    if (ubicacion) {
      const { lat, lng } = ubicacion;
      if (lat < NARINO.latMin || lat > NARINO.latMax || lng < NARINO.lngMin || lng > NARINO.lngMax) {
        throw new ErrorApp(400, 'La ubicación debe estar en Nariño');
      }
    }
    const [p] = await db.update(productores).set({ lat: ubicacion?.lat ?? null, lng: ubicacion?.lng ?? null })
      .where(eq(productores.id, productorId)).returning({ lat: productores.lat, lng: productores.lng });
    return p;
  },
};
