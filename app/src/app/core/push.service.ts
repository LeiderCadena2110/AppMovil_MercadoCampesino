import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { NavController, ToastController } from '@ionic/angular';
import { environment } from '../../environments/environment';

/**
 * Notificaciones push (Firebase Cloud Messaging). Solo en el APK y solo si se compiló con
 * google-services.json (environment.push = true); sin eso, Firebase no existe y no se llama.
 * Avisos: pedido nuevo o pagado (productor) y cambios de estado del pedido (comprador).
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private nav = inject(NavController);
  private toast = inject(ToastController);
  private token: string | null = null;
  private iniciado = false;

  readonly disponible = Capacitor.isNativePlatform() && environment.push;

  /** Pide permiso, registra el teléfono en la API y escucha los avisos (una vez por sesión) */
  async iniciar() {
    if (!this.disponible || this.iniciado) return;
    this.iniciado = true;
    try {
      let permiso = (await PushNotifications.checkPermissions()).receive;
      if (permiso === 'prompt' || permiso === 'prompt-with-rationale') permiso = (await PushNotifications.requestPermissions()).receive;
      if (permiso !== 'granted') return;
      await PushNotifications.createChannel({
        id: 'pedidos', name: 'Pedidos', description: 'Pedidos nuevos, pagos y cambios de estado', importance: 4, visibility: 1, vibration: true,
      }).catch(() => undefined);

      await PushNotifications.addListener('registration', ({ value }) => {
        this.token = value;
        this.http.post(`${environment.apiUrl}/dispositivos`, { token: value, plataforma: 'android' }).subscribe({ error: () => undefined });
      });
      await PushNotifications.addListener('registrationError', (e) => console.warn('[push] registro fallido', e.error));
      // Con la app abierta: se muestra un aviso dentro de la app
      await PushNotifications.addListener('pushNotificationReceived', async (n) => {
        const t = await this.toast.create({
          header: n.title, message: n.body, duration: 5000, position: 'top', color: 'dark',
          buttons: n.data?.pedidoId ? [{ text: 'Ver', handler: () => this.abrir(n.data) }] : [],
        });
        await t.present();
      });
      // Al tocar la notificación: se abre el pedido
      await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => this.abrir(notification.data));
      await PushNotifications.register();
    } catch (e) {
      console.warn('[push] no disponible', e);
    }
  }

  /** Al cerrar sesión: este teléfono deja de recibir avisos de esa cuenta */
  olvidar() {
    if (this.token) this.http.request('DELETE', `${environment.apiUrl}/dispositivos`, { body: { token: this.token } }).subscribe({ error: () => undefined });
    this.token = null;
    this.iniciado = false;
    if (this.disponible) PushNotifications.removeAllListeners().catch(() => undefined);
  }

  private abrir(datos?: { pedidoId?: string; rol?: string }) {
    if (!datos?.pedidoId) return;
    this.nav.navigateForward([datos.rol === 'PRODUCTOR' ? '/productor/pedido' : '/comprador/pedido', datos.pedidoId]);
  }
}
