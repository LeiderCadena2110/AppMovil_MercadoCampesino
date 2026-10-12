import { asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categorias, municipios } from '../db/schema.js';
import { productoService } from '../services/productoService.js';

const id = (req) => Number(req.params.id);

export const catalogoController = {
  categorias: async (_req, res) => res.json(await db.select().from(categorias).orderBy(asc(categorias.nombre))),
  municipios: async (_req, res) => res.json(await db.select().from(municipios).orderBy(asc(municipios.nombre))),
  productos: async (req, res) => res.json(await productoService.catalogo(req.datos)),
  producto: async (req, res) => res.json(await productoService.detalle(id(req))),
  productor: async (req, res) => res.json(await productoService.perfilProductor(id(req))),
};
