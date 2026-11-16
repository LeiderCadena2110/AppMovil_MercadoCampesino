import { pedidoService } from '../services/orderService.js';
import { ErrorApp } from '../middlewares/errors.js';

const CLAVE_VALIDA = /^[A-Za-z0-9-]{8,64}$/;

const id = (req) => Number(req.params.id);

export const pedidoController = {
  async crear(req, res) {
    const clave = req.get('Idempotency-Key');
    if (clave !== undefined && !CLAVE_VALIDA.test(clave)) {
      throw new ErrorApp(400, 'Idempotency-Key inválida (8 a 64 letras, números o guiones)');
    }
    const r = await pedidoService.crear(req.usuario.id, req.body, clave);
    if (r.repetida) res.set('Idempotent-Replayed', 'true');
    res.status(201).json(r.pedidos);
  },
  async listar(req, res) {
    const { items, hayMas } = await pedidoService.listar(req.usuario, req.datos);
    // Se sigue respondiendo un arreglo (compatible con versiones viejas de la app)
    res.set('X-Hay-Mas', String(hayMas)).json(items);
  },
  detalle: async (req, res) => res.json(await pedidoService.detalle(req.usuario, id(req))),
  estado: async (req, res) => res.json(await pedidoService.cambiarEstado(req.usuario, id(req), req.body.estado)),
  calificar: async (req, res) => res.status(201).json(await pedidoService.calificar(req.usuario, id(req), req.body)),
};
