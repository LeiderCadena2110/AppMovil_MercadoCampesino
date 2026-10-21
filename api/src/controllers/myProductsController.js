import { productoService } from '../services/productService.js';

const id = (req) => Number(req.params.id);
const productorId = (req) => req.usuario.productorId;

export const misProductosController = {
  listar: async (req, res) => res.json(await productoService.misProductos(productorId(req))),
  crear: async (req, res) => res.status(201).json(await productoService.crear(productorId(req), req.body)),
  actualizar: async (req, res) => res.json(await productoService.actualizar(productorId(req), id(req), req.body)),
  eliminar: async (req, res) => res.json(await productoService.eliminar(productorId(req), id(req))),
  foto: async (req, res) => res.json(await productoService.subirFoto(productorId(req), id(req), req.file)),
};
