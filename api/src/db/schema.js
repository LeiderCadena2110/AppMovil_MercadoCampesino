// Modelo de datos de Minga App (Neon / PostgreSQL) con Drizzle ORM.
import { relations } from 'drizzle-orm';
import {
  pgTable, pgEnum, serial, integer, doublePrecision, varchar, text, numeric, boolean, timestamp, index, uniqueIndex, primaryKey, jsonb, uuid,
} from 'drizzle-orm/pg-core';

export const rolEnum = pgEnum('rol', ['COMPRADOR', 'PRODUCTOR', 'ADMIN']);
export const estadoPedidoEnum = pgEnum('estado_pedido', ['PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'LISTO', 'ENTREGADO']);
export const metodoEntregaEnum = pgEnum('metodo_entrega', ['CONTRA_ENTREGA', 'RECOGIDA']);
// NO_APLICA: se paga al recibir o al recoger. Los demás: pago en línea.
export const pagoEstadoEnum = pgEnum('pago_estado', ['NO_APLICA', 'PENDIENTE', 'APROBADO', 'RECHAZADO']);

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  telefono: varchar('telefono', { length: 20 }),
  passwordHash: text('password_hash').notNull(),
  rol: rolEnum('rol').notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
});

export const municipios = pgTable('municipios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 80 }).notNull().unique(),
  departamento: varchar('departamento', { length: 80 }).notNull().default('Nariño'),
  // Centro aproximado del casco urbano (para ubicar las fincas que no marcaron su punto)
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
});

export const productores = pgTable('productores', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').notNull().unique().references(() => usuarios.id, { onDelete: 'cascade' }),
  nombreFinca: varchar('nombre_finca', { length: 120 }).notNull(),
  municipioId: integer('municipio_id').notNull().references(() => municipios.id),
  descripcion: text('descripcion'),
  verificado: boolean('verificado').notNull().default(false),
  // Punto exacto de la finca (opcional, lo marca el productor). Es privado:
  // al público solo se muestra redondeado (~1 km).
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
});

export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 60 }).notNull().unique(),
  icono: varchar('icono', { length: 40 }),
});

export const productos = pgTable('productos', {
  id: serial('id').primaryKey(),
  productorId: integer('productor_id').notNull().references(() => productores.id, { onDelete: 'cascade' }),
  categoriaId: integer('categoria_id').notNull().references(() => categorias.id),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  precio: numeric('precio', { precision: 12, scale: 2 }).notNull(),
  unidad: varchar('unidad', { length: 20 }).notNull(), // kg, libra, arroba, unidad, bulto
  descripcion: text('descripcion'), // la puede redactar el productor o la IA
  stock: integer('stock').notNull(),
  fotoUrl: text('foto_url'),
  activo: boolean('activo').notNull().default(true),
  oculto: boolean('oculto').notNull().default(false), // moderación del administrador
  // Id que genera el teléfono al crear el producto (también sin señal): si la sincronización
  // se repite, no se crea dos veces
  clienteId: uuid('cliente_id'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('productos_categoria_idx').on(t.categoriaId), index('productos_productor_idx').on(t.productorId),
  uniqueIndex('productos_productor_cliente_uq').on(t.productorId, t.clienteId),
]);

// Un pago en línea cubre todos los pedidos de una compra (una finca = un pedido).
// El estado real lo confirma la pasarela por webhook; nunca se toma lo que dice la app.
export const pagos = pgTable('pagos', {
  id: uuid('id').primaryKey().defaultRandom(),
  compradorId: integer('comprador_id').notNull().references(() => usuarios.id),
  proveedor: varchar('proveedor', { length: 20 }).notNull(), // mercadopago | simulado
  proveedorId: varchar('proveedor_id', { length: 100 }),      // id de la orden en la pasarela
  estado: pagoEstadoEnum('estado').notNull().default('PENDIENTE'),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  urlPago: text('url_pago'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('pagos_proveedor_idx').on(t.proveedor, t.proveedorId), index('pagos_comprador_idx').on(t.compradorId)]);

export const pedidos = pgTable('pedidos', {
  id: serial('id').primaryKey(),
  compradorId: integer('comprador_id').notNull().references(() => usuarios.id),
  productorId: integer('productor_id').notNull().references(() => productores.id),
  estado: estadoPedidoEnum('estado').notNull().default('PENDIENTE'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  direccion: text('direccion').notNull(),
  metodoEntrega: metodoEntregaEnum('metodo_entrega').notNull(),
  pagoEstado: pagoEstadoEnum('pago_estado').notNull().default('NO_APLICA'),
  pagoId: uuid('pago_id').references(() => pagos.id),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('pedidos_comprador_idx').on(t.compradorId), index('pedidos_productor_idx').on(t.productorId)]);

export const detallePedido = pgTable('detalle_pedido', {
  id: serial('id').primaryKey(),
  pedidoId: integer('pedido_id').notNull().references(() => pedidos.id, { onDelete: 'cascade' }),
  productoId: integer('producto_id').notNull().references(() => productos.id),
  cantidad: integer('cantidad').notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 12, scale: 2 }).notNull(),
});

export const calificaciones = pgTable('calificaciones', {
  id: serial('id').primaryKey(),
  pedidoId: integer('pedido_id').notNull().references(() => pedidos.id, { onDelete: 'cascade' }),
  puntaje: integer('puntaje').notNull(),
  comentario: text('comentario'),
}, (t) => [uniqueIndex('calificaciones_pedido_uq').on(t.pedidoId)]);

// Sesiones: cada inicio de sesión tiene un refresh token (se guarda solo su hash).
// Al usarlo se rota: el viejo queda revocado y apunta al nuevo. Si alguien presenta uno ya
// rotado (posible robo), se cierran todas las sesiones de ese usuario.
export const sesiones = pgTable('sesiones', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: integer('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  dispositivo: varchar('dispositivo', { length: 200 }),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  revocadaEn: timestamp('revocada_en', { withTimezone: true }),
  reemplazadaPor: uuid('reemplazada_por'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('sesiones_usuario_idx').on(t.usuarioId)]);

// Claves de idempotencia de POST /pedidos: si la red reintenta la misma compra,
// se devuelve el resultado guardado en vez de crear pedidos duplicados.
export const solicitudesIdempotentes = pgTable('solicitudes_idempotentes', {
  usuarioId: integer('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  clave: varchar('clave', { length: 64 }).notNull(),
  huella: varchar('huella', { length: 64 }).notNull(), // sha256 del cuerpo: la misma clave no sirve para otra compra
  respuesta: jsonb('respuesta'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.usuarioId, t.clave] }), index('solicitudes_idempotentes_creado_idx').on(t.creadoEn)]);

// Teléfonos donde cada usuario recibe notificaciones push (token de Firebase Cloud Messaging).
// Un mismo teléfono puede cambiar de usuario: el token es único y se reasigna.
export const dispositivos = pgTable('dispositivos', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  plataforma: varchar('plataforma', { length: 20 }).notNull().default('android'),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('dispositivos_usuario_idx').on(t.usuarioId)]);

// Historial de precios: cada precio publicado (al crear o cambiar un producto) y cada precio
// pedido (lo que de verdad se compró). Es la base para predecir precios y medir el error.
// Guarda nombre, unidad, categoría y municipio del momento: si el producto cambia o se borra, el dato sigue.
export const fuentePrecioEnum = pgEnum('fuente_precio', ['publicado', 'pedido']);
export const historialPrecios = pgTable('historial_precios', {
  id: serial('id').primaryKey(),
  productoId: integer('producto_id').references(() => productos.id, { onDelete: 'set null' }),
  productorId: integer('productor_id').notNull().references(() => productores.id, { onDelete: 'cascade' }),
  categoriaId: integer('categoria_id').notNull().references(() => categorias.id),
  municipioId: integer('municipio_id').references(() => municipios.id),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  unidad: varchar('unidad', { length: 20 }).notNull(),
  precio: numeric('precio', { precision: 12, scale: 2 }).notNull(),
  fuente: fuentePrecioEnum('fuente').notNull(),
  cantidad: integer('cantidad'), // solo en pedidos
  registradoEn: timestamp('registrado_en', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('historial_precios_serie_idx').on(t.categoriaId, t.unidad, t.registradoEn),
  index('historial_precios_producto_idx').on(t.productoId),
]);

// Relaciones para consultas con `with`
export const usuariosRel = relations(usuarios, ({ one, many }) => ({
  productor: one(productores, { fields: [usuarios.id], references: [productores.usuarioId] }),
  pedidos: many(pedidos),
}));
export const productoresRel = relations(productores, ({ one, many }) => ({
  usuario: one(usuarios, { fields: [productores.usuarioId], references: [usuarios.id] }),
  municipio: one(municipios, { fields: [productores.municipioId], references: [municipios.id] }),
  productos: many(productos),
  pedidos: many(pedidos),
}));
export const productosRel = relations(productos, ({ one }) => ({
  productor: one(productores, { fields: [productos.productorId], references: [productores.id] }),
  categoria: one(categorias, { fields: [productos.categoriaId], references: [categorias.id] }),
}));
export const pedidosRel = relations(pedidos, ({ one, many }) => ({
  comprador: one(usuarios, { fields: [pedidos.compradorId], references: [usuarios.id] }),
  productor: one(productores, { fields: [pedidos.productorId], references: [productores.id] }),
  detalles: many(detallePedido),
  calificacion: one(calificaciones, { fields: [pedidos.id], references: [calificaciones.pedidoId] }),
  pago: one(pagos, { fields: [pedidos.pagoId], references: [pagos.id] }),
}));
export const pagosRel = relations(pagos, ({ many }) => ({ pedidos: many(pedidos) }));
export const detallePedidoRel = relations(detallePedido, ({ one }) => ({
  pedido: one(pedidos, { fields: [detallePedido.pedidoId], references: [pedidos.id] }),
  producto: one(productos, { fields: [detallePedido.productoId], references: [productos.id] }),
}));
export const municipiosRel = relations(municipios, ({ many }) => ({ productores: many(productores) }));
export const categoriasRel = relations(categorias, ({ many }) => ({ productos: many(productos) }));
