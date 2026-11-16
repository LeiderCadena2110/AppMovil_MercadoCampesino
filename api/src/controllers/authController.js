import { authService } from '../services/authService.js';

const dispositivo = (req) => req.get('User-Agent') ?? null;

export const authController = {
  registro: async (req, res) => res.status(201).json(await authService.registrar(req.body, dispositivo(req))),
  login: async (req, res) => res.json(await authService.login(req.body, dispositivo(req))),
  refrescar: async (req, res) => res.json(await authService.refrescar(req.body.refreshToken, dispositivo(req))),
  async salir(req, res) {
    await authService.cerrarSesion(req.body.refreshToken);
    res.status(204).end();
  },
  yo: async (req, res) => res.json(await authService.yo(req.usuario.id)),
};
