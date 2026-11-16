import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Almacenamiento cifrado para la sesión (tokens).
 * Android: cifrado con una clave del Android Keystore. iOS: Keychain. Navegador: localStorage.
 * Los datos que no son secretos (carrito, caché del catálogo) siguen en core/storage.ts.
 */
let listo: Promise<void> | null = null;
const preparar = () => (listo ??= SecureStorage.setKeyPrefix('minga_').catch(() => undefined));

export const almacenSeguro = {
  async leer<T>(clave: string): Promise<T | null> {
    try {
      await preparar();
      return ((await SecureStorage.get(clave)) as T | null) ?? null;
    } catch {
      return null;
    }
  },
  async guardar(clave: string, valor: unknown) {
    await preparar();
    await SecureStorage.set(clave, valor as Record<string, unknown>);
  },
  async borrar(clave: string) {
    try {
      await preparar();
      await SecureStorage.remove(clave);
    } catch {
      // ya no existía
    }
  },
};
