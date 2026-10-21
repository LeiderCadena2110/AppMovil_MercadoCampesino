import { Preferences } from '@capacitor/preferences';

/** Guarda y lee JSON en el teléfono (Capacitor Preferences; en el navegador usa localStorage). */
export const almacen = {
  async leer<T>(clave: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key: clave });
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },
  guardar: (clave: string, valor: unknown) => Preferences.set({ key: clave, value: JSON.stringify(valor) }),
  borrar: (clave: string) => Preferences.remove({ key: clave }),
};
