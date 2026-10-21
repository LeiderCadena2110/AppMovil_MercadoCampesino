import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productores } from '../db/schema.js';
import { productoRepository } from '../repositories/productRepository.js';
import { almacenamiento } from '../storage/index.js';
import { ErrorApp } from '../middlewares/errors.js';

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
      with: {
        municipio: true,
        usuario: { columns: { nombre: true, telefono: true } },
        productos: { where: (p, { and, eq: igual }) => and(igual(p.activo, true), igual(p.oculto, false)) },
      },
    });
    if (!productor) throw new ErrorApp(404, 'Productor no encontrado');
    return { ...productor, productos: productor.productos.map(conMiniatura) };
  },

  misProductos: async (productorId) => (await productoRepository.delProductor(productorId)).map(conMiniatura),

  crear: (productorId, datos) => productoRepository.crear({ ...datos, precio: String(datos.precio), productorId }),

  async actualizar(productorId, id, datos) {
    await propio(productorId, id);
    return productoRepository.actualizar(id, { ...datos, precio: String(datos.precio) });
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
