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

export const ESTADOS: Record<EstadoPedido, { texto: string; color: string }> = {
  PENDIENTE: { texto: 'Pendiente', color: 'warning' },
  ACEPTADO: { texto: 'Aceptado', color: 'primary' },
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
