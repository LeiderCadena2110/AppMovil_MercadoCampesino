import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  /** Primera página (30 más recientes), opcionalmente solo activos o cerrados */
  listar = (estado?: 'activos' | 'cerrados') => this.pagina(1, estado).then((r) => r.items);

  /** Página n de pedidos; hayMas dice si hay otra página */
  async pagina(pagina: number, estado?: 'activos' | 'cerrados') {
    let params = new HttpParams().set('pagina', pagina);
    if (estado) params = params.set('estado', estado);
    const r = await firstValueFrom(this.http.get<Pedido[]>(this.api, { params, observe: 'response' }));
    return { items: r.body ?? [], hayMas: r.headers.get('X-Hay-Mas') === 'true' };
  }
  detalle = (id: number) => firstValueFrom(this.http.get<Pedido>(`${this.api}/${id}`));
  cambiarEstado = (id: number, estado: EstadoPedido) => firstValueFrom(this.http.patch<Pedido>(`${this.api}/${id}/estado`, { estado }));
  calificar = (id: number, puntaje: number, comentario?: string) =>
    firstValueFrom(this.http.post(`${this.api}/${id}/calificacion`, { puntaje, comentario }));
}
