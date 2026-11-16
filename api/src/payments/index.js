// Única elección de pasarela: Mercado Pago si hay credenciales; si no, la simulada
// (siempre en desarrollo; en producción solo con PAGOS_SIMULADOS=1, para demostraciones).
import { env } from '../config/env.js';
import { MercadoPagoGateway } from './MercadoPagoGateway.js';
import { SimulatedGateway } from './SimulatedGateway.js';

export const pasarelas = {
  mercadopago: new MercadoPagoGateway(),
  simulado: new SimulatedGateway(),
};

export function pasarelaActiva() {
  if (env.mpAccessToken) return pasarelas.mercadopago;
  if (!env.produccion || env.pagosSimulados) return pasarelas.simulado;
  return null;
}
