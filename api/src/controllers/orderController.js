import { pedidoService } from '../services/orderService.js';

const id = (req) => Number(req.params.id);

export const pedidoController = {
  crear: async (req, res) => res.status(201).json(await pedidoService.crear(req.usuario.id, req.body)),
  listar: async (req, res) => res.json(await pedidoService.listar(req.usuario)),
  detalle: async (req, res) => res.json(await pedidoService.detalle(req.usuario, id(req))),
  estado: async (req, res) => res.json(await pedidoService.cambiarEstado(req.usuario, id(req), req.body.estado)),
  calificar: async (req, res) => res.status(201).json(await pedidoService.calificar(req.usuario, id(req), req.body)),
};
