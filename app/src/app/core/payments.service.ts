import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Pago, PagoEstado } from './models';

const ESPERA_MAX_MS = 15 * 60_000;
const CADA_MS = 3000;

/**
 * Pagos en línea. El pago se hace en la página de la pasarela (Mercado Pago o la de prueba),
 * abierta en un navegador dentro de la app. Mientras está abierta, la app pregunta a la API
 * el estado; cuando el pago se aprueba o se rechaza, cierra el navegador sola.
 * El estado real siempre lo decide la API (confirmado por la pasarela), no la app.
 */
@Injectable({ providedIn: 'root' })
export class PagosService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/pagos`;
  private disponibleCache: Promise<boolean> | null = null;

  /** ¿La API acepta pagos en línea? (se consulta una vez) */
  disponible(): Promise<boolean> {
    this.disponibleCache ??= firstValueFrom(this.http.get<{ pagos?: string }>(`${environment.apiUrl}/salud`))
      .then((r) => !!r.pagos && r.pagos !== 'sin configurar')
      .catch(() => { this.disponibleCache = null; return false; });
    return this.disponibleCache;
  }

  crear = (pedidoIds: number[]) => firstValueFrom(this.http.post<Pago>(this.api, { pedidoIds }));
  estado = (id: string) => firstValueFrom(this.http.get<Pago>(`${this.api}/${id}`));

  /** Crea el cobro, abre la página de pago y espera el resultado. Devuelve el estado final conocido. */
  async pagar(pedidoIds: number[]): Promise<PagoEstado> {
    const pago = await this.crear(pedidoIds);
    if (!pago.urlPago) throw new Error('La pasarela no entregó la página de pago');
    return this.esperarResultado(pago);
  }

  private async esperarResultado(pago: Pago): Promise<PagoEstado> {
    let cerrado = false;
    let oyente: PluginListenerHandle | null = null;
    let ventana: Window | null = null;
    if (Capacitor.isNativePlatform()) {
      oyente = await Browser.addListener('browserFinished', () => { cerrado = true; });
      await Browser.open({ url: pago.urlPago!, presentationStyle: 'popover', toolbarColor: '#1F4D2B' });
    } else {
      ventana = window.open(pago.urlPago!, '_blank');
    }
    const fin = Date.now() + ESPERA_MAX_MS;
    let estado: PagoEstado = 'PENDIENTE';
    try {
      while (Date.now() < fin) {
        await new Promise((r) => setTimeout(r, CADA_MS));
        estado = (await this.estado(pago.id).catch(() => ({ estado: 'PENDIENTE' as PagoEstado }))).estado;
        if (estado !== 'PENDIENTE') break;
        if (cerrado || ventana?.closed) {
          // El comprador cerró la página: una última consulta por si el aviso apenas llegó
          await new Promise((r) => setTimeout(r, 1500));
          estado = (await this.estado(pago.id).catch(() => ({ estado: 'PENDIENTE' as PagoEstado }))).estado;
          break;
        }
      }
    } finally {
      await oyente?.remove();
      // Se deja ver la página de resultado un momento y se vuelve a la app
      if (Capacitor.isNativePlatform() && !cerrado) {
        await new Promise((r) => setTimeout(r, 1200));
        await Browser.close().catch(() => undefined);
      }
    }
    return estado;
  }
}
