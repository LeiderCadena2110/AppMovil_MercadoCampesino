import { env } from '../config/env.js';
import { CloudinaryStorage } from './CloudinaryStorage.js';
import { LocalStorage } from './LocalStorage.js';
import { AlmacenamientoDeshabilitado } from './DisabledStorage.js';

// Único lugar donde se elige el proveedor. Para migrar a S3 o R2:
// crear S3Storage.js que extienda AlmacenamientoImagenes y cambiar esta función.
function elegir() {
  if (env.cloudinaryUrl) return { almacen: new CloudinaryStorage(), tipo: 'cloudinary' };
  if (env.produccion) {
    console.warn('[fotos] Falta CLOUDINARY_URL: las subidas de fotos se rechazarán hasta configurarla.');
    return { almacen: new AlmacenamientoDeshabilitado(), tipo: 'sin configurar' };
  }
  return { almacen: new LocalStorage(), tipo: 'local (solo desarrollo)' };
}

const { almacen, tipo } = elegir();
export const almacenamiento = almacen;
export const tipoAlmacenamiento = tipo;
