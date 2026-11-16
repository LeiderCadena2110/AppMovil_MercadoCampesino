import { Injectable, computed, signal } from '@angular/core';
import { almacen } from './storage';
import { ProductoLista } from './models';

export interface ItemCarrito { producto: ProductoLista; cantidad: number; }

@Injectable({ providedIn: 'root' })
export class CarritoService {
  readonly items = signal<ItemCarrito[]>([]);
  readonly cantidad = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));
  readonly total = computed(() => this.items().reduce((s, i) => s + Number(i.producto.precio) * i.cantidad, 0));

  /** Agrupa por finca: cada grupo se convierte en un pedido */
  readonly porProductor = computed(() => {
    type Grupo = { productorId: number; finca: string; productor?: string; municipio: string; verificado?: boolean; items: ItemCarrito[]; subtotal: number };
    const grupos = new Map<number, Grupo>();
    for (const i of this.items()) {
      const p = i.producto;
      const g = grupos.get(p.productorId) ??
        { productorId: p.productorId, finca: p.finca, productor: p.productor, municipio: p.municipio, verificado: p.verificado, items: [], subtotal: 0 };
      g.items.push(i);
      g.subtotal += Number(i.producto.precio) * i.cantidad;
      grupos.set(i.producto.productorId, g);
    }
    return [...grupos.values()];
  });

  async cargar() {
    this.items.set((await almacen.leer<ItemCarrito[]>('carrito')) ?? []);
  }

  agregar(producto: ProductoLista, cantidad = 1) {
    const actual = this.items();
    const existe = actual.find((i) => i.producto.id === producto.id);
    const nuevo = existe
      ? actual.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: Math.min(i.cantidad + cantidad, producto.stock) } : i))
      : [...actual, { producto, cantidad: Math.min(cantidad, producto.stock) }];
    this.fijar(nuevo);
  }

  cambiar(productoId: number, cantidad: number) {
    if (cantidad <= 0) return this.quitar(productoId);
    this.fijar(this.items().map((i) => (i.producto.id === productoId ? { ...i, cantidad: Math.min(cantidad, i.producto.stock) } : i)));
  }

  quitar(productoId: number) {
    this.fijar(this.items().filter((i) => i.producto.id !== productoId));
  }

  /** Devuelve un ítem quitado a su posición original (para "Deshacer") */
  restaurar(item: ItemCarrito, posicion: number) {
    const lista = this.items().filter((i) => i.producto.id !== item.producto.id);
    lista.splice(Math.min(posicion, lista.length), 0, item);
    this.fijar(lista);
  }

  vaciar() {
    this.fijar([]);
  }

  private fijar(items: ItemCarrito[]) {
    this.items.set(items);
    almacen.guardar('carrito', items);
  }
}
