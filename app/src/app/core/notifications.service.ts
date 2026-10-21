import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { mensajeError } from './auth.interceptor';

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private toast = inject(ToastController);
  private alert = inject(AlertController);

  async exito(mensaje: string) {
    const t = await this.toast.create({ message: mensaje, duration: 2000, color: 'success', position: 'top' });
    await t.present();
  }

  async error(err: unknown) {
    const t = await this.toast.create({ message: mensajeError(err), duration: 3500, color: 'danger', position: 'top' });
    await t.present();
  }

  async confirmar(titulo: string, mensaje: string, aceptar = 'Sí'): Promise<boolean> {
    const a = await this.alert.create({
      header: titulo, message: mensaje,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: aceptar, role: 'confirm' }],
    });
    await a.present();
    return (await a.onDidDismiss()).role === 'confirm';
  }
}
