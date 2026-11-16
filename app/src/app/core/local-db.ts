/**
 * Base de datos local del teléfono (IndexedDB del WebView). A diferencia de Preferences,
 * guarda archivos (las fotos tomadas sin señal) y no tiene límite práctico de tamaño.
 */
const NOMBRE = 'minga';
const VERSION = 1;
export const COLA = 'cola';

let abierta: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  abierta ??= new Promise((resolver, rechazar) => {
    const r = indexedDB.open(NOMBRE, VERSION);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(COLA)) r.result.createObjectStore(COLA, { keyPath: 'id' });
    };
    r.onsuccess = () => resolver(r.result);
    r.onerror = () => { abierta = null; rechazar(r.error); };
  });
  return abierta;
}

async function transaccion<T>(almacen: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(almacen, modo);
    const peticion = fn(tx.objectStore(almacen));
    tx.oncomplete = () => resolver(peticion.result);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

export const baseLocal = {
  todos: <T>(almacen: string) => transaccion<T[]>(almacen, 'readonly', (s) => s.getAll() as IDBRequest<T[]>),
  guardar: <T>(almacen: string, valor: T) => transaccion(almacen, 'readwrite', (s) => s.put(valor)),
  borrar: (almacen: string, clave: string) => transaccion(almacen, 'readwrite', (s) => s.delete(clave)),
  limpiar: (almacen: string) => transaccion(almacen, 'readwrite', (s) => s.clear()),
};
