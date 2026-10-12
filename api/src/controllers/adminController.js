import { adminService } from '../services/adminService.js';

export const adminController = {
  productores: async (req, res) => {
    const v = req.query.verificado;
    res.json(await adminService.productores(v === undefined ? undefined : v === 'true'));
  },
  verificar: async (req, res) => res.json(await adminService.verificar(Number(req.params.id), req.body?.verificado ?? true)),
  ocultar: async (req, res) => res.json(await adminService.ocultarProducto(Number(req.params.id), req.body?.oculto ?? true)),
};
