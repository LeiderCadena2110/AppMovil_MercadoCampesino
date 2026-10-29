import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { almacen } from './storage';
import { Categoria, Municipio, PaginaCatalogo, Producto, ProductoLista, Productor } from './models';

/** Producto del detalle → fila del catálogo (para tarjetas) */
export function aLista(p: Producto): ProductoLista {
  return {
    id: p.id, nombre: p.nombre, precio: p.precio, unidad: p.unidad, stock: p.stock, fotoUrl: p.fotoUrl,
    miniaturaUrl: p.miniaturaUrl ?? p.fotoUrl, productorId: p.productorId, finca: p.productor?.nombreFinca ?? '',
    productor: p.productor?.usuario?.nombre, verificado: p.productor?.verificado,
    municipio: p.productor?.municipio?.nombre ?? '', categoria: p.categoria?.nombre ?? '',
  };
}

export type OrdenCatalogo = 'recientes' | 'precio_asc' | 'precio_desc';
export interface FiltrosCatalogo {
  categoria?: number | null; municipio?: number | null; q?: string; pagina?: number;
  precioMin?: number | null; precioMax?: number | null;
  /** Disponibilidad: solo productos con al menos esta cantidad */
  stockMin?: number | null;
  orden?: OrdenCatalogo; excluir?: number | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Catálogo paginado. La primera página sin filtros se guarda para verla sin señal (RNF-03). */
  async productos(f: FiltrosCatalogo): Promise<PaginaCatalogo & { sinConexion?: boolean }> {
    let params = new HttpParams().set('pagina', f.pagina ?? 1);
    if (f.categoria) params = params.set('categoria', f.categoria);
    if (f.municipio) params = params.set('municipio', f.municipio);
    if (f.q) params = params.set('q', f.q);
    if (f.precioMin != null) params = params.set('precioMin', f.precioMin);
    if (f.precioMax != null) params = params.set('precioMax', f.precioMax);
    if (f.stockMin) params = params.set('stockMin', f.stockMin);
    if (f.orden && f.orden !== 'recientes') params = params.set('orden', f.orden);
    if (f.excluir) params = params.set('excluir', f.excluir);
    const esPortada = (f.pagina ?? 1) === 1 && params.keys().length === 1;
    try {
      const r = await firstValueFrom(this.http.get<PaginaCatalogo>(`${this.api}/productos`, { params }));
      if (esPortada) await almacen.guardar('cache_catalogo', r);
      return r;
    } catch (e) {
      const cache = esPortada ? await almacen.leer<PaginaCatalogo>('cache_catalogo') : null;
      if (cache) return { ...cache, sinConexion: true };
      throw e;
    }
  }

  producto = (id: number) => firstValueFrom(this.http.get<Producto>(`${this.api}/productos/${id}`));
  productor = (id: number) => firstValueFrom(this.http.get<Productor>(`${this.api}/productores/${id}`));

  async categorias() {
    return this.listaConCache<Categoria>('categorias');
  }

  async municipios() {
    return this.listaConCache<Municipio>('municipios');
  }

  private async listaConCache<T>(ruta: string): Promise<T[]> {
    try {
      const r = await firstValueFrom(this.http.get<T[]>(`${this.api}/${ruta}`));
      await almacen.guardar(`cache_${ruta}`, r);
      return r;
    } catch (e) {
      const cache = await almacen.leer<T[]>(`cache_${ruta}`);
      if (cache) return cache;
      throw e;
    }
  }
}
