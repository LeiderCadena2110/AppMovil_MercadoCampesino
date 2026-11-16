import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productores, productos } from '../db/schema.js';
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
        // El teléfono no es público: solo se comparte dentro de un pedido
        usuario: { columns: { nombre: true } },
        productos: { where: (p, { and, eq: igual }) => and(igual(p.activo, true), igual(p.oculto, false)) },
      },
    });
    if (!productor) throw new ErrorApp(404, 'Productor no encontrado');
    return { ...productor, productos: productor.productos.map(conMiniatura) };
  },

  misProductos: async (productorId) => (await productoRepository.delProductor(productorId)).map(conMiniatura),

  /**
   * Con clienteId (lo envía el teléfono) crear es idempotente: si ese producto ya llegó en una
   * sincronización anterior, se devuelve el existente en vez de crear otro. { producto, repetido }
   */
  async crear(productorId, datos) {
    const fila = { ...datos, precio: String(datos.precio), productorId };
    if (!datos.clienteId) return { producto: await productoRepository.crear(fila), repetido: false };
    const [nuevo] = await db.insert(productos).values(fila).onConflictDoNothing().returning();
    if (nuevo) return { producto: nuevo, repetido: false };
    const [previo] = await db.select().from(productos)
      .where(and(eq(productos.productorId, productorId), eq(productos.clienteId, datos.clienteId)));
    return { producto: previo, repetido: true };
  },

  async actualizar(productorId, id, datos) {
    await propio(productorId, id);
    const { clienteId: _ignorado, ...cambios } = datos; // el id del teléfono no se cambia
    return productoRepository.actualizar(id, { ...cambios, precio: String(cambios.precio) });
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
