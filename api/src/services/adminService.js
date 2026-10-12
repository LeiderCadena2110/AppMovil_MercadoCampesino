import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productores, productos } from '../db/schema.js';
import { ErrorApp } from '../middlewares/errores.js';

export const adminService = {
  productores: (verificado) => db.query.productores.findMany({
    where: verificado === undefined ? undefined : eq(productores.verificado, verificado),
    with: { municipio: true, usuario: { columns: { nombre: true, email: true, telefono: true } } },
  }),

  async verificar(id, verificado = true) {
    const [r] = await db.update(productores).set({ verificado }).where(eq(productores.id, id)).returning();
    if (!r) throw new ErrorApp(404, 'Productor no encontrado');
    return r;
  },

  async ocultarProducto(id, oculto = true) {
    const [r] = await db.update(productos).set({ oculto }).where(eq(productos.id, id)).returning();
    if (!r) throw new ErrorApp(404, 'Producto no encontrado');
    return r;
  },
};
