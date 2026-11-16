import { iaService } from '../services/aiService.js';

export const iaController = {
  estado: (_req, res) => res.json(iaService.estado()),
  asistente: async (req, res) => res.json(await iaService.asistente(req.body)),
  descripcion: async (req, res) => res.json(await iaService.descripcion(req.body)),
  async foto(req, res) {
    if (!req.file) return res.status(400).json({ error: 'Envía una foto JPG, PNG o WebP de hasta 5 MB en el campo "foto"' });
    res.json(await iaService.reconocerFoto({ datos: req.file.buffer, mime: req.file.mimetype }));
  },
  dictado: async (req, res) => res.json(await iaService.dictado(req.body)),
  precio: async (req, res) => res.json(await iaService.precio(req.body)),
};
