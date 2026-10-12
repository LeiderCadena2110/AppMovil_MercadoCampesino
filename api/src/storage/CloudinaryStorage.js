import { v2 as cloudinary } from 'cloudinary';
import { AlmacenamientoImagenes } from './AlmacenamientoImagenes.js';

// Usa la variable CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME).
export class CloudinaryStorage extends AlmacenamientoImagenes {
  constructor() {
    super();
    cloudinary.config({ secure: true });
  }

  subir(buffer, nombre) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'mercado-campesino/productos',
          public_id: nombre,
          overwrite: true,
          // Se guarda ya reducida: ahorra datos al productor y al comprador
          transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
        },
        (error, resultado) => (error ? reject(error) : resolve({ url: resultado.secure_url, id: resultado.public_id })),
      );
      stream.end(buffer);
    });
  }

  async eliminar(id) {
    await cloudinary.uploader.destroy(id);
  }

  // Inserta la transformación en la URL: WebP/AVIF automático y tamaño pequeño
  miniatura(url, ancho = 300) {
    if (!url?.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/c_fill,w_${ancho},h_${ancho},f_auto,q_auto/`);
  }
}
