import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productores, productos } from '../db/schema.js';
import { productoRepository } from '../repositories/productRepository.js';
import { almacenamiento } from '../storage/index.js';
import { ErrorApp } from '../middlewares/errors.js';
import { ubicacionPublica } from './mapService.js';
import { registrarPrecio } from '../repositories/priceHistoryRepository.js';

const conMiniatura = (p) => ({ ...p, miniaturaUrl: p.fotoUrl ? almacenamiento.miniatura(p.fotoUrl, 300) : null });

async function propio(productorId, id) {
  const producto = await productoRepository.porId(id);
  if (!producto) throw new ErrorApp(404, 'Producto no encontrado');
  if (producto.productorId !== productorId) throw new ErrorApp(403, 'Este producto no es tuyo');
  return producto;
}

export const productoService = {
  async catalogo(filtros) {
    const r = await productoRepository.catalogo(filtros);
    return { ...r, items: r.items.map(conMiniatura) };
  },

  async detalle(id) {
    const p = await productoRepository.detalle(id);
    if (!p) throw new ErrorApp(404, 'Producto no encontrado');
    return p;
  },

  async perfilProductor(id) {
    const productor = await db.query.productores.findFirst({
      where: eq(productores.id, id),
      columns: { lat: false, lng: false }, // el punto exacto es privado: se da la ubicación aproximada
      with: {
        municipio: true,
        // El teléfono no es público: solo se comparte dentro de un pedido
        usuario: { columns: { nombre: true } },
        productos: { where: (p, { and, eq: igual }) => and(igual(p.activo, true), igual(p.oculto, false)) },
      },
    });
    if (!productor) throw new ErrorApp(404, 'Productor no encontrado');
    const [exacta] = await db.select({ lat: productores.lat, lng: productores.lng }).from(productores).where(eq(productores.id, id));
    return { ...productor, ubicacion: ubicacionPublica({ id, ...exacta }, productor.municipio), productos: productor.productos.map(conMiniatura) };
  },

  misProductos: async (productorId) => (await productoRepository.delProductor(productorId)).map(conMiniatura),

  /**
   * Con clienteId (lo envía el teléfono) crear es idempotente: si ese producto ya llegó en una
   * sincronización anterior, se devuelve el existente en vez de crear otro. { producto, repetido }
   */
  async crear(productorId, datos) {
    const fila = { ...datos, precio: String(datos.precio), productorId };
    if (!datos.clienteId) {
      const producto = await productoRepository.crear(fila);
      await registrarPrecio(producto, 'publicado');
      return { producto, repetido: false };
    }
    const [nuevo] = await db.insert(productos).values(fila).onConflictDoNothing().returning();
    if (nuevo) {
      await registrarPrecio(nuevo, 'publicado');
      return { producto: nuevo, repetido: false };
    }
    const [previo] = await db.select().from(productos)
      .where(and(eq(productos.productorId, productorId), eq(productos.clienteId, datos.clienteId)));
    return { producto: previo, repetido: true };
  },

  async actualizar(productorId, id, datos) {
    const antes = await propio(productorId, id);
    const { clienteId: _ignorado, ...cambios } = datos; // el id del teléfono no se cambia
    const producto = await productoRepository.actualizar(id, { ...cambios, precio: String(cambios.precio) });
    // Solo se guarda en el historial si el precio (o la unidad) cambió de verdad
    if (Number(antes.precio) !== Number(producto.precio) || antes.unidad !== producto.unidad) await registrarPrecio(producto, 'publicado');
    return producto;
  },

  async eliminar(productorId, id) {
    await propio(productorId, id);
    // Si ya tiene pedidos no se borra: se desactiva para conservar el historial
    try {
      await productoRepository.eliminar(id);
      return { eliminado: true };
    } catch (e) {
      if (e?.cause?.code === '23503' || e?.code === '23503') {
        await productoRepository.actualizar(id, { activo: false });
        return { eliminado: false, desactivado: true };
      }
      throw e;
    }
  },

  async subirFoto(productorId, id, archivo) {
    if (!archivo) throw new ErrorApp(400, 'Adjunta una foto en el campo "foto"');
    await propio(productorId, id);
    const { url } = await almacenamiento.subir(archivo.buffer, `producto-${id}`);
    return productoRepository.actualizar(id, { fotoUrl: url });
  },
};
