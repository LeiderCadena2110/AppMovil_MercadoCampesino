// Pasarela Mercado Pago con la API de Orders (Checkout Pro): el comprador paga en la página de
// Mercado Pago (PSE, tarjeta, Nequi...) y Mercado Pago avisa por webhook firmado.
// Credenciales de prueba (TEST-...) en MP_ACCESS_TOKEN y la clave del webhook en MP_WEBHOOK_SECRET.
import { env } from '../config/env.js';
import { firmaValida, idDelEvento } from './signature.js';

const API = 'https://api.mercadopago.com/v1/orders';
const ESTADOS = { processed: 'APROBADO', canceled: 'RECHAZADO', cancelled: 'RECHAZADO', failed: 'RECHAZADO', expired: 'RECHAZADO', refunded: 'RECHAZADO' };

export class MercadoPagoGateway {
  nombre = 'mercadopago';

  async crearCobro({ pago, items, email, urlRetorno }) {
    const r = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.mpAccessToken}`, 'Content-Type': 'application/json', accept: 'application/json',
        'X-Idempotency-Key': pago.id, // un reintento no crea otra orden
      },
      body: JSON.stringify({
        type: 'online',
        processing_mode: 'manual',
        external_reference: pago.id,
        total_amount: String(Math.round(Number(pago.monto))), // pesos colombianos sin centavos
        payer: { email },
        items: items.map((i) => ({ title: i.titulo.slice(0, 120), unit_price: String(Math.round(i.precio)), quantity: i.cantidad })),
        config: { online: { success_url: urlRetorno, failure_url: urlRetorno, pending_url: urlRetorno, auto_return: 'approved' } },
        expiration_time: 'P1D',
      }),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok || !datos.checkout_url) throw new Error(`Mercado Pago respondió ${r.status}: ${JSON.stringify(datos).slice(0, 200)}`);
    return { proveedorId: datos.id, urlPago: datos.checkout_url };
  }

  /** Estado real de la orden en Mercado Pago */
  async consultar(proveedorId) {
    const r = await fetch(`${API}/${encodeURIComponent(proveedorId)}`, { headers: { Authorization: `Bearer ${env.mpAccessToken}` } });
    if (!r.ok) throw new Error(`Mercado Pago respondió ${r.status} al consultar la orden`);
    const { status } = await r.json();
    return ESTADOS[status] ?? 'PENDIENTE';
  }

  /** Comprueba la firma del webhook; devuelve el id de la orden o null si no es auténtico */
  verificarEvento(req) {
    const dataId = idDelEvento(req);
    const ok = firmaValida({ cabecera: req.get('x-signature'), dataId, requestId: req.get('x-request-id'), secreto: env.mpWebhookSecret });
    return ok ? dataId : null;
  }
}
