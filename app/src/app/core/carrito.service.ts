import { Injectable, computed, signal } from '@angular/core';
import { almacen } from './almacen';
import { ProductoLista } from './models';

export interface ItemCarrito { producto: ProductoLista; cantidad: number; }

@Injectable({ providedIn: 'root' })
export class CarritoService {
  readonly items = signal<ItemCarrito[]>([]);
  readonly cantidad = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));
  readonly total = computed(() => this.items().reduce((s, i) => s + Number(i.producto.precio) * i.cantidad, 0));

  /** Agrupa por finca: cada grupo se convierte en un pedido */
  readonly porProductor = computed(() => {
    const grupos = new Map<number, { finca: string; items: ItemCarrito[]; subtotal: number }>();
    for (const i of this.items()) {
      const g = grupos.get(i.producto.productorId) ?? { finca: i.producto.finca, items: [], subtotal: 0 };
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

  vaciar() {
    this.fijar([]);
  }

  private fijar(items: ItemCarrito[]) {
    this.items.set(items);
    almacen.guardar('carrito', items);
  }
}
