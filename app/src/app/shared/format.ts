import { Pipe, PipeTransform } from '@angular/core';
import { EstadoPedido } from '../core/models';

/** 45000 → "$ 45.000" */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  private f = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  transform(v: string | number | null | undefined) {
    return this.f.format(Number(v ?? 0));
  }
}

/** Nombres que ve la gente para los estados que maneja la API */
export const ESTADOS: Record<EstadoPedido, { texto: string; color: string }> = {
  PENDIENTE: { texto: 'Recibido', color: 'warning' },
  ACEPTADO: { texto: 'Confirmado', color: 'primary' },
  RECHAZADO: { texto: 'Rechazado', color: 'danger' },
  LISTO: { texto: 'Listo', color: 'tertiary' },
  ENTREGADO: { texto: 'Entregado', color: 'success' },
};

@Pipe({ name: 'estado' })
export class EstadoPipe implements PipeTransform {
  transform(e: EstadoPedido, campo: 'texto' | 'color' = 'texto') {
    return ESTADOS[e]?.[campo] ?? e;
  }
}

/** "arroba" con 40 → "arrobas"; "kg" no cambia. Uso: {{ 'libra' | unidad: 3 }} → "libras" */
@Pipe({ name: 'unidad' })
export class UnidadPipe implements PipeTransform {
  transform(unidad: string | null | undefined, cantidad = 2) {
    const u = unidad ?? '';
    if (Number(cantidad) === 1 || u === 'kg' || !u) return u;
    return u.endsWith('d') ? `${u}es` : `${u}s`; // unidad → unidades; libra → libras
  }
}
