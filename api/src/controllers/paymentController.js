import express from 'express';
import { pagoService } from '../services/paymentService.js';
import { pasarelas } from '../payments/index.js';
import { paginaPagoSimulado, paginaResultado } from '../payments/pages.js';

export const pagoController = {
  crear: async (req, res) => res.status(201).json(await pagoService.crear(req.usuario, req.body.pedidoIds)),
  estado: async (req, res) => res.json(await pagoService.estado(req.usuario, req.params.id)),

  /** Webhook de la pasarela: firma inválida → 401; auténtico → 200 siempre */
  async evento(req, res) {
    const r = await pagoService.procesarEvento(req.params.proveedor, req);
    res.status(200).json(r);
  },

  /** A donde vuelve el comprador después de pagar (sin sesión: solo muestra el estado) */
  async retorno(req, res) {
    const pago = await pagoService.estadoPublico(req.query.pago);
    res.type('html').send(paginaResultado(pago?.estado));
  },

  // ---- Pasarela simulada
  paginaSimulada(req, res) {
    if (pagoService.disponible() !== 'simulado') return res.status(404).type('html').send(paginaResultado(null));
    res.type('html').send(paginaPagoSimulado(req.params.cobro, pasarelas.simulado.cobro(req.params.cobro)));
  },

  resultadoSimulado: [express.urlencoded({ extended: false, limit: '2kb' }), async (req, res) => {
    if (pagoService.disponible() !== 'simulado') return res.status(404).end();
    const aviso = await pasarelas.simulado.resolver(req.params.cobro, req.body.resultado === 'aprobar');
    if (aviso) {
      // Igual que una pasarela real: se envía el webhook firmado por HTTP a la API.
      // Si la API no puede llamarse a sí misma (p. ej. en pruebas), se procesa el mismo aviso aquí.
      let entregado = false;
      try {
        const r = await fetch(aviso.url, { method: 'POST', headers: aviso.headers, body: JSON.stringify(aviso.body), signal: AbortSignal.timeout(5000) });
        entregado = r.ok;
      } catch { /* sin red hacia sí misma */ }
      if (!entregado) {
        const falso = { query: { 'data.id': aviso.body.data.id }, body: aviso.body, get: (h) => aviso.headers[h.toLowerCase()] };
        await pagoService.procesarEvento('simulado', falso).catch((e) => console.warn('[pagos] aviso simulado:', e.message));
      }
    }
    const cobro = pasarelas.simulado.cobro(req.params.cobro);
    res.type('html').send(paginaResultado(cobro?.estado));
  }],
};

