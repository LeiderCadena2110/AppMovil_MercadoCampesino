import { AlmacenamientoImagenes } from './ImageStorage.js';
import { ErrorApp } from '../middlewares/errors.js';

/**
 * Se usa en producción cuando falta CLOUDINARY_URL. El disco de Render (y de la
 * mayoría de servidores gratis) se borra en cada reinicio: guardar fotos ahí las
 * perdería sin aviso. Es mejor rechazar la subida con un mensaje claro.
 */
export class AlmacenamientoDeshabilitado extends AlmacenamientoImagenes {
  async subir() {
    throw new ErrorApp(503, 'Las fotos no se pueden guardar todavía: falta configurar el almacenamiento (CLOUDINARY_URL) en el servidor.');
  }
  async eliminar() {}
}
