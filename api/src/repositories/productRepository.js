import { and, eq, gt, gte, lte, ne, ilike, asc, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productos, productores, municipios, categorias, usuarios } from '../db/schema.js';

export const TAMANO_PAGINA = 20;

// Columnas mínimas para la lista: menos datos por la red (RNF-02)
const columnasLista = {
  id: productos.id,
  nombre: productos.nombre,
  precio: productos.precio,
  unidad: productos.unidad,
  stock: productos.stock,
  fotoUrl: productos.fotoUrl,
  productorId: productos.productorId,
  finca: productores.nombreFinca,
  productor: usuarios.nombre,
  verificado: productores.verificado,
  municipio: municipios.nombre,
  categoria: categorias.nombre,
};

export const productoRepository = {
  async catalogo({ categoria, municipio, q, pagina, precioMin, precioMax, stockMin, orden, excluir }) {
    const filtros = [eq(productos.activo, true), eq(productos.oculto, false), gt(productos.stock, 0)];
    if (categoria) filtros.push(eq(productos.categoriaId, categoria));
    if (municipio) filtros.push(eq(productores.municipioId, municipio));
    if (q) filtros.push(ilike(productos.nombre, `%${q}%`));
    if (precioMin != null) filtros.push(gte(productos.precio, String(precioMin)));
    if (precioMax != null) filtros.push(lte(productos.precio, String(precioMax)));
    if (stockMin) filtros.push(gte(productos.stock, stockMin));
    if (excluir) filtros.push(ne(productos.id, excluir)); // para "productos relacionados"
    const donde = and(...filtros);

    const base = db.select(columnasLista).from(productos)
      .innerJoin(productores, eq(productos.productorId, productores.id))
      .innerJoin(usuarios, eq(productores.usuarioId, usuarios.id))
      .innerJoin(municipios, eq(productores.municipioId, municipios.id))
      .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
      .where(donde);

    const ordenes = {
      recientes: [desc(productos.creadoEn)],
      precio_asc: [asc(productos.precio), desc(productos.creadoEn)],
      precio_desc: [desc(productos.precio), desc(productos.creadoEn)],
    };

    const [items, [{ total }]] = await Promise.all([
      base.orderBy(...(ordenes[orden] ?? ordenes.recientes)).limit(TAMANO_PAGINA).offset((pagina - 1) * TAMANO_PAGINA),
      db.select({ total: sql`count(*)::int` }).from(productos)
        .innerJoin(productores, eq(productos.productorId, productores.id)).where(donde),
    ]);
    return { items, total, pagina, paginas: Math.ceil(total / TAMANO_PAGINA) };
  },

  // Productos disponibles para que la IA los conozca (máx. 80, los más recientes)
  paraIa: (limite = 80) => db.select(columnasLista).from(productos)
    .innerJoin(productores, eq(productos.productorId, productores.id))
    .innerJoin(usuarios, eq(productores.usuarioId, usuarios.id))
    .innerJoin(municipios, eq(productores.municipioId, municipios.id))
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(and(eq(productos.activo, true), eq(productos.oculto, false), gt(productos.stock, 0)))
    .orderBy(desc(productos.creadoEn)).limit(limite),

  // Precios de productos parecidos (misma unidad; misma categoría o nombre similar) para sugerir precio
  preciosParecidos: ({ categoriaId, unidad, palabra }) => db
    .select({ nombre: productos.nombre, precio: productos.precio, categoriaId: productos.categoriaId })
    .from(productos)
    .where(and(
      eq(productos.unidad, unidad),
      eq(productos.oculto, false),
      palabra ? sql`(${productos.categoriaId} = ${categoriaId} OR ${productos.nombre} ILIKE ${'%' + palabra + '%'})`
        : eq(productos.categoriaId, categoriaId),
    ))
    .limit(200),

  detalle: (id) => db.query.productos.findFirst({
    where: and(eq(productos.id, id), eq(productos.oculto, false)),
    with: {
      categoria: true,
      productor: { with: { municipio: true, usuario: { columns: { nombre: true, telefono: true } } } },
    },
  }),

  porId: (id, tx = db) => tx.query.productos.findFirst({ where: eq(productos.id, id) }),

  delProductor: (productorId) => db.query.productos.findMany({
    where: eq(productos.productorId, productorId),
    orderBy: desc(productos.creadoEn),
    with: { categoria: true },
  }),

  crear: (datos) => db.insert(productos).values(datos).returning().then((r) => r[0]),
  actualizar: (id, datos, tx = db) => tx.update(productos).set(datos).where(eq(productos.id, id)).returning().then((r) => r[0]),
  eliminar: (id) => db.delete(productos).where(eq(productos.id, id)),

  // Descuenta stock solo si alcanza (evita vender más de lo que hay)
  descontarStock: (id, cantidad, tx) => tx.update(productos)
    .set({ stock: sql`${productos.stock} - ${cantidad}` })
    .where(and(eq(productos.id, id), sql`${productos.stock} >= ${cantidad}`))
    .returning({ id: productos.id }),

  devolverStock: (id, cantidad, tx) => tx.update(productos)
    .set({ stock: sql`${productos.stock} + ${cantidad}` }).where(eq(productos.id, id)),
};
