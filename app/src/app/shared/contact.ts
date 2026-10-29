/**
 * Contacto entre comprador y productor. Solo se muestra dentro de un pedido,
 * es decir, a las dos personas que ya tienen un acuerdo de compra.
 * El teléfono no se publica en el catálogo ni en el perfil de la finca.
 */

/** "300 111 2233" o "+57 3001112233" → "573001112233" (formato que usa WhatsApp) */
export function telefonoInternacional(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`; // celular colombiano
  if (digitos.length === 12 && digitos.startsWith('57')) return digitos;
  return digitos.length >= 7 ? digitos : null;
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const numero = telefonoInternacional(telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;
}

export function enlaceLlamada(telefono: string | null | undefined): string | null {
  const numero = (telefono ?? '').replace(/[^\d+]/g, '');
  return numero.length >= 7 ? `tel:${numero}` : null;
}
