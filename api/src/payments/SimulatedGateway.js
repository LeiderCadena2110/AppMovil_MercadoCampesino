// Pasarela simulada para desarrollo, pruebas y demostraciones (no mueve dinero).
// Se comporta como una real: el comprador va a una página de pago, aprueba o rechaza,
// y la "pasarela" envía un webhook firmado (mismo esquema de Mercado Pago) a /api/pagos/simulado/eventos.
import { createHmac, randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { firmar, firmaValida, idDelEvento } from './signature.js';

// Estado de cada cobro "en la pasarela" (como lo tendría Mercado Pago en sus servidores)
const cobros = new Map();

export const secretoSimulado = () => env.pagosSimuladosSecreto || createHmac('sha256', env.jwtSecret).update('pagos-simulados').digest('hex');

export class SimulatedGateway {
  nombre = 'simulado';

  async crearCobro({ pago }) {
    const proveedorId = `sim${pago.id.replace(/-/g, '')}`;
    cobros.set(proveedorId, { estado: 'PENDIENTE', monto: Number(pago.monto) });
    return { proveedorId, urlPago: `${env.urlPublica}/api/pagos/simulado/${proveedorId}` };
  }

  async consultar(proveedorId) {
    const c = cobros.get(proveedorId);
    if (!c) throw new Error('Cobro simulado desconocido (¿se reinició el servidor?)');
    return c.estado;
  }

  verificarEvento(req) {
    const dataId = idDelEvento(req);
    return firmaValida({ cabecera: req.get('x-signature'), dataId, requestId: req.get('x-request-id'), secreto: secretoSimulado() }) ? dataId : null;
  }

  cobro = (proveedorId) => cobros.get(proveedorId);

  /** El comprador decidió en la página de pago: se guarda y se envía el webhook firmado */
  async resolver(proveedorId, aprobado) {
    const c = cobros.get(proveedorId);
    if (!c) return null;
    c.estado = aprobado ? 'APROBADO' : 'RECHAZADO';
    return evento(proveedorId);
  }
}

/** Arma un webhook igual al que enviaría la pasarela (para enviarlo por HTTP o procesarlo directo) */
export function evento(proveedorId) {
  const requestId = randomUUID();
  return {
    url: `${env.urlPublica}/api/pagos/simulado/eventos?data.id=${proveedorId}&type=order`,
    headers: { 'Content-Type': 'application/json', 'x-request-id': requestId, 'x-signature': firmar({ dataId: proveedorId, requestId, secreto: secretoSimulado() }) },
    body: { type: 'order', action: 'order.updated', data: { id: proveedorId } },
  };
}
