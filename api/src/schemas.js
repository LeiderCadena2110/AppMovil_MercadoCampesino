import { z } from 'zod';

const telefono = z.string().trim().min(7).max(20).optional();

export const registroSchema = z.discriminatedUnion('rol', [
  z.object({
    rol: z.literal('COMPRADOR'),
    nombre: z.string().trim().min(2),
    email: z.string().trim().toLowerCase().email(),
    telefono,
    password: z.string().min(8, 'mínimo 8 caracteres'),
  }),
  z.object({
    rol: z.literal('PRODUCTOR'),
    nombre: z.string().trim().min(2),
    email: z.string().trim().toLowerCase().email(),
    telefono,
    password: z.string().min(8, 'mínimo 8 caracteres'),
    nombreFinca: z.string().trim().min(2),
    municipioId: z.coerce.number().int().positive(),
    descripcion: z.string().trim().max(500).optional(),
  }),
]);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const productoSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  categoriaId: z.coerce.number().int().positive(),
  precio: z.coerce.number().positive().max(100_000_000),
  unidad: z.enum(['kg', 'libra', 'arroba', 'unidad', 'bulto', 'atado', 'litro']),
  stock: z.coerce.number().int().min(0),
  activo: z.boolean().optional(),
});

export const catalogoQuery = z.object({
  categoria: z.coerce.number().int().positive().optional(),
  municipio: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(60).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
});

export const pedidoSchema = z.object({
  direccion: z.string().trim().min(5),
  metodoEntrega: z.enum(['CONTRA_ENTREGA', 'RECOGIDA']),
  items: z.array(z.object({
    productoId: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().int().positive(),
  })).min(1),
});

export const estadoSchema = z.object({
  estado: z.enum(['ACEPTADO', 'RECHAZADO', 'LISTO', 'ENTREGADO']),
});

export const calificacionSchema = z.object({
  puntaje: z.coerce.number().int().min(1).max(5),
  comentario: z.string().trim().max(300).optional(),
});
