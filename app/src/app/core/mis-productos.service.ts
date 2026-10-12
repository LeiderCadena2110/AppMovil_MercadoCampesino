import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto } from './models';

export interface ProductoForm { nombre: string; categoriaId: number; precio: number; unidad: string; stock: number; activo?: boolean; }

@Injectable({ providedIn: 'root' })
export class MisProductosService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/mis-productos`;

  listar = () => firstValueFrom(this.http.get<Producto[]>(this.api));
  crear = (p: ProductoForm) => firstValueFrom(this.http.post<Producto>(this.api, p));
  actualizar = (id: number, p: ProductoForm) => firstValueFrom(this.http.put<Producto>(`${this.api}/${id}`, p));
  eliminar = (id: number) => firstValueFrom(this.http.delete<{ eliminado: boolean; desactivado?: boolean }>(`${this.api}/${id}`));

  subirFoto(id: number, archivo: Blob) {
    const datos = new FormData();
    datos.append('foto', archivo, 'foto.jpg');
    return firstValueFrom(this.http.post<Producto>(`${this.api}/${id}/foto`, datos));
  }
}
