import { db } from '../db/index.js';
import { historialPrecios, productores } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Guarda un precio en el historial con los datos del producto en ese momento.
 * @param {object} producto  fila de productos (id, productorId, categoriaId, nombre, unidad, precio)
 * @param {'publicado'|'pedido'} fuente
 */
export async function registrarPrecio(producto, fuente, { cantidad, precio, tx = db } = {}) {
  const [p] = await tx.select({ municipioId: productores.municipioId }).from(productores).where(eq(productores.id, producto.productorId));
  await tx.insert(historialPrecios).values({
    productoId: producto.id, productorId: producto.productorId, categoriaId: producto.categoriaId, municipioId: p?.municipioId ?? null,
    nombre: producto.nombre, unidad: producto.unidad, precio: String(precio ?? producto.precio), fuente, cantidad: cantidad ?? null,
  });
}
