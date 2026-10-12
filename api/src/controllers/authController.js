import { authService } from '../services/authService.js';

export const authController = {
  registro: async (req, res) => res.status(201).json(await authService.registrar(req.body)),
  login: async (req, res) => res.json(await authService.login(req.body)),
  yo: async (req, res) => res.json(await authService.yo(req.usuario.id)),
};
