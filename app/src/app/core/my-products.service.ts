import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { almacen } from './storage';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto } from './models';

export interface ProductoForm {
  nombre: string; categoriaId: number; precio: number; unidad: string; stock: number; activo?: boolean; descripcion?: string;
  /** Id generado en el teléfono al crear (evita duplicados al sincronizar) */
  clienteId?: string;
}

@Injectable({ providedIn: 'root' })
export class MisProductosService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/mis-productos`;

  /** Lista del servidor; sin señal, la última que se vio (con sinConexion = true) */
  async listar(): Promise<Producto[] & { sinConexion?: boolean }> {
    try {
      const r = await firstValueFrom(this.http.get<Producto[]>(this.api));
      await almacen.guardar('cache_mis_productos', r);
      return r;
    } catch (e) {
      const cache = await almacen.leer<Producto[]>('cache_mis_productos');
      if (cache && e instanceof HttpErrorResponse && (e.status === 0 || e.status >= 500)) return Object.assign(cache, { sinConexion: true });
      throw e;
    }
  }
  crear = (p: ProductoForm) => firstValueFrom(this.http.post<Producto>(this.api, p));
  actualizar = (id: number, p: ProductoForm) => firstValueFrom(this.http.put<Producto>(`${this.api}/${id}`, p));
  eliminar = (id: number) => firstValueFrom(this.http.delete<{ eliminado: boolean; desactivado?: boolean }>(`${this.api}/${id}`));

  subirFoto(id: number, archivo: Blob) {
    const datos = new FormData();
    datos.append('foto', archivo, 'foto.jpg');
    return firstValueFrom(this.http.post<Producto>(`${this.api}/${id}/foto`, datos));
  }
}
