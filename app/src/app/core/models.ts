export type Rol = 'COMPRADOR' | 'PRODUCTOR' | 'ADMIN';
export type EstadoPedido = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'LISTO' | 'ENTREGADO';
export type MetodoEntrega = 'CONTRA_ENTREGA' | 'RECOGIDA';

export interface Municipio { id: number; nombre: string; departamento: string; }
export interface Categoria { id: number; nombre: string; icono: string | null; }

export interface Productor {
  id: number; usuarioId: number; nombreFinca: string; municipioId: number;
  descripcion: string | null; verificado: boolean;
  municipio?: Municipio; usuario?: { nombre: string; telefono: string | null; email?: string };
  productos?: Producto[];
}

export interface Usuario {
  id: number; nombre: string; email: string; telefono: string | null; rol: Rol;
  productor?: Productor | null;
}

export interface Sesion { token: string; usuario: Usuario; }

/** Fila del catálogo: solo lo que la lista necesita */
export interface ProductoLista {
  id: number; nombre: string; precio: string; unidad: string; stock: number;
  fotoUrl: string | null; miniaturaUrl: string | null;
  productorId: number; finca: string; municipio: string; categoria: string;
}

export interface Producto {
  id: number; productorId: number; categoriaId: number; nombre: string; precio: string;
  unidad: string; stock: number; fotoUrl: string | null; miniaturaUrl?: string | null;
  activo: boolean; oculto: boolean;
  categoria?: Categoria; productor?: Productor;
}

export interface PaginaCatalogo { items: ProductoLista[]; total: number; pagina: number; paginas: number; }

export interface DetallePedido {
  id: number; productoId: number; cantidad: number; precioUnitario: string;
  producto: { id: number; nombre: string; unidad: string; fotoUrl: string | null };
}

export interface Pedido {
  id: number; compradorId: number; productorId: number; estado: EstadoPedido; total: string;
  direccion: string; metodoEntrega: MetodoEntrega; creadoEn: string;
  detalles: DetallePedido[];
  productor: { id: number; nombreFinca: string; usuario: { nombre: string; telefono: string | null } };
  comprador: { id: number; nombre: string; telefono: string | null };
  calificacion: { puntaje: number; comentario: string | null } | null;
}

export const UNIDADES = ['kg', 'libra', 'arroba', 'unidad', 'bulto', 'atado', 'litro'] as const;
