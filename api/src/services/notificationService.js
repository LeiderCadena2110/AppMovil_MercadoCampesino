// Avisos push de Minga App. Nunca rompen el flujo: si Firebase no está configurado o falla,
// solo se registra en el log. Se llaman después de guardar los cambios (no dentro de la transacción).
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dispositivos, productores } from '../db/schema.js';
import { enviarPush, pushDisponible } from '../push/fcm.js';

const pesos = (n) => `$${Math.round(Number(n)).toLocaleString('es-CO')}`;

const TEXTO_ESTADO = {
  ACEPTADO: (p) => ({ titulo: 'Tu pedido fue aceptado', cuerpo: `${p.finca} ya está preparando tu pedido #${p.id}.` }),
  LISTO: (p) => ({ titulo: 'Tu pedido está listo', cuerpo: `El pedido #${p.id} de ${p.finca} está listo para entrega.` }),
  ENTREGADO: (p) => ({ titulo: 'Pedido entregado', cuerpo: `¿Cómo te fue con ${p.finca}? Califica tu pedido #${p.id}.` }),
  RECHAZADO: (p) => ({ titulo: 'Tu pedido no pudo atenderse', cuerpo: `${p.finca} no puede atender el pedido #${p.id}. Puedes pedir a otra finca.` }),
};

export const notificaciones = {
  disponible: pushDisponible,

  async registrarDispositivo(usuarioId, { token, plataforma = 'android' }) {
    await db.insert(dispositivos).values({ usuarioId, token, plataforma })
      .onConflictDoUpdate({ target: dispositivos.token, set: { usuarioId, plataforma, actualizadoEn: new Date() } });
  },

  async quitarDispositivo(usuarioId, token) {
    const filas = await db.delete(dispositivos).where(eq(dispositivos.token, token)).returning({ usuarioId: dispositivos.usuarioId });
    // Si el token era de otro usuario no se revela nada: se responde igual
    return filas.some((f) => f.usuarioId === usuarioId);
  },

  /** Envía a todos los teléfonos de esos usuarios y borra los tokens que ya no sirven */
  async avisar(usuarioIds, mensaje) {
    if (!pushDisponible() || usuarioIds.length === 0) return 0;
    try {
      const destinos = await db.select().from(dispositivos).where(inArray(dispositivos.usuarioId, usuarioIds));
      const resultados = await Promise.all(destinos.map(async (d) => [d, await enviarPush(d.token, mensaje)]));
      const invalidos = resultados.filter(([, r]) => r === 'token-invalido').map(([d]) => d.token);
      if (invalidos.length) await db.delete(dispositivos).where(inArray(dispositivos.token, invalidos));
      return resultados.filter(([, r]) => r === 'ok').length;
    } catch (e) {
      console.warn('[push] aviso fallido:', e.message);
      return 0;
    }
  },

  /** Al productor: llegó un pedido (los pagados en línea se avisan cuando se aprueba el pago) */
  async pedidoNuevo(pedido) {
    const usuarioId = await usuarioDelProductor(pedido.productorId);
    return this.avisar([usuarioId], {
      titulo: 'Tienes un pedido nuevo',
      cuerpo: `Pedido #${pedido.id} por ${pesos(pedido.total)}. Ábrelo para aceptarlo.`,
      datos: { tipo: 'pedido', pedidoId: pedido.id, rol: 'PRODUCTOR' },
    });
  },

  /** Al comprador: el productor cambió el estado de su pedido */
  async estadoCambiado(pedido, finca) {
    const texto = TEXTO_ESTADO[pedido.estado];
    if (!texto) return 0;
    return this.avisar([pedido.compradorId], { ...texto({ id: pedido.id, finca }), datos: { tipo: 'pedido', pedidoId: pedido.id, rol: 'COMPRADOR' } });
  },

  /** Al productor: el comprador ya pagó en línea */
  async pedidoPagado(pedido) {
    const usuarioId = await usuarioDelProductor(pedido.productorId);
    return this.avisar([usuarioId], {
      titulo: 'Pedido pagado',
      cuerpo: `El pedido #${pedido.id} ya está pagado (${pesos(pedido.total)}). Ábrelo para aceptarlo.`,
      datos: { tipo: 'pedido', pedidoId: pedido.id, rol: 'PRODUCTOR' },
    });
  },
};

async function usuarioDelProductor(productorId) {
  const [p] = await db.select({ usuarioId: productores.usuarioId }).from(productores).where(eq(productores.id, productorId));
  return p?.usuarioId;
}
