import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Vibraciones cortas para confirmar acciones. Solo en el teléfono (en la web no hace nada)
 * y nunca rompe el flujo si el dispositivo no las soporta.
 */
export const vibrar = {
  toque() {
    if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  },
  exito() {
    if (Capacitor.isNativePlatform()) Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  },
  aviso() {
    if (Capacitor.isNativePlatform()) Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
  },
};
