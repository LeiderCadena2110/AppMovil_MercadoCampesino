import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductoLista } from './models';

export interface MensajeIa { rol: 'usuario' | 'ia'; texto: string; productos?: ProductoLista[]; }
export interface RespuestaAsistente { respuesta: string; productos: ProductoLista[]; fuente: 'gemini' | 'local'; }
export interface PrecioSugerido { sugerido: number | null; minimo?: number; maximo?: number; muestras: number; explicacion: string; }

/** Funciones de inteligencia artificial que ofrece la API (/api/ia) */
@Injectable({ providedIn: 'root' })
export class IaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/ia`;

  asistente(mensaje: string, historial: MensajeIa[]) {
    // Solo se envía el texto de los últimos mensajes: menos datos por la red
    const h = historial.slice(-8).map(({ rol, texto }) => ({ rol, texto: texto.slice(0, 1500) }));
    return firstValueFrom(this.http.post<RespuestaAsistente>(`${this.api}/asistente`, { mensaje, historial: h }));
  }

  descripcion(datos: { nombre: string; unidad: string; categoria?: string; municipio?: string; finca?: string; notas?: string }) {
    return firstValueFrom(this.http.post<{ descripcion: string }>(`${this.api}/descripcion`, datos));
  }

  precio(datos: { nombre: string; categoriaId: number; unidad: string }) {
    return firstValueFrom(this.http.post<PrecioSugerido>(`${this.api}/precio`, datos));
  }
}
