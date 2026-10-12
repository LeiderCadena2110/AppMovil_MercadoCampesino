import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto, Productor } from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  productores = (verificado?: boolean) =>
    firstValueFrom(this.http.get<Productor[]>(`${this.api}/productores`, { params: verificado === undefined ? {} : { verificado } }));
  verificar = (id: number, verificado: boolean) =>
    firstValueFrom(this.http.patch<Productor>(`${this.api}/productores/${id}/verificar`, { verificado }));
  ocultarProducto = (id: number, oculto: boolean) =>
    firstValueFrom(this.http.patch<Producto>(`${this.api}/productos/${id}/ocultar`, { oculto }));
}
