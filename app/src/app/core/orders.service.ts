import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstadoPedido, MetodoEntrega, Pedido } from './models';

/** Identificador único por compra (crypto.randomUUID con respaldo) */
export function nuevaClave(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/pedidos`;

  /** claveIdempotencia: la misma en cada reintento de una compra, así nunca se duplica el pedido */
  crear = (datos: { direccion: string; metodoEntrega: MetodoEntrega; items: { productoId: number; cantidad: number }[] },
    claveIdempotencia: string) =>
    firstValueFrom(this.http.post<Pedido[]>(this.api, datos, { headers: { 'Idempotency-Key': claveIdempotencia } }));

  listar = () => firstValueFrom(this.http.get<Pedido[]>(this.api));
  detalle = (id: number) => firstValueFrom(this.http.get<Pedido>(`${this.api}/${id}`));
  cambiarEstado = (id: number, estado: EstadoPedido) => firstValueFrom(this.http.patch<Pedido>(`${this.api}/${id}/estado`, { estado }));
  calificar = (id: number, puntaje: number, comentario?: string) =>
    firstValueFrom(this.http.post(`${this.api}/${id}/calificacion`, { puntaje, comentario }));
}
