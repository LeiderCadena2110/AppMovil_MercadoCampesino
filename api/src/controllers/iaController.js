import { iaService } from '../services/iaService.js';

export const iaController = {
  estado: (_req, res) => res.json(iaService.estado()),
  asistente: async (req, res) => res.json(await iaService.asistente(req.body)),
  descripcion: async (req, res) => res.json(await iaService.descripcion(req.body)),
  precio: async (req, res) => res.json(await iaService.precio(req.body)),
};
