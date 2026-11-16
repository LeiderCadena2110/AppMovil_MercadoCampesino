import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductoLista } from './models';

export interface MensajeIa { rol: 'usuario' | 'ia'; texto: string; productos?: ProductoLista[]; consultas?: string[]; }
export interface RespuestaAsistente { respuesta: string; productos: ProductoLista[]; consultas?: string[]; fuente: 'gemini' | 'local'; }
export interface ProductoReconocido {
  reconocido: boolean; nombre?: string; categoriaId?: number | null; unidad?: string | null;
  descripcion?: string | null; confianza?: 'alta' | 'media' | 'baja'; fuente: 'gemini' | 'local';
}
export interface DictadoEntendido {
  nombre: string | null; precio: number | null; unidad: string | null; stock: number | null; categoriaId: number | null;
  fuente: 'gemini' | 'local';
}
export interface PrecioSugerido {
  sugerido: number | null; minimo?: number; maximo?: number; muestras: number; explicacion: string;
  /** % de cambio frente a las dos semanas anteriores (solo con historial) */
  tendencia?: number | null; fuente?: 'historial' | 'catalogo';
}

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

  estado() {
    return firstValueFrom(this.http.get<{ activa: boolean; proveedor: 'gemini' | 'local' }>(`${this.api}/estado`));
  }

  /** Qué producto se ve en la foto (nombre, categoría, unidad y descripción) */
  reconocerFoto(foto: Blob) {
    const datos = new FormData();
    datos.append('foto', foto, 'foto.jpg');
    return firstValueFrom(this.http.post<ProductoReconocido>(`${this.api}/foto`, datos));
  }

  /** Campos del producto a partir de lo que dijo el productor */
  dictado(texto: string) {
    return firstValueFrom(this.http.post<DictadoEntendido>(`${this.api}/dictado`, { texto }));
  }

  precio(datos: { nombre: string; categoriaId: number; unidad: string }) {
    return firstValueFrom(this.http.post<PrecioSugerido>(`${this.api}/precio`, datos));
  }
}
