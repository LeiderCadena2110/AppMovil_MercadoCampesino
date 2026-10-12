/**
 * Contrato (patrón Strategy/Adapter) para guardar fotos de productos.
 * Cualquier proveedor (Cloudinary hoy; S3 o R2 mañana) debe implementar:
 *
 *   subir(buffer: Buffer, nombre: string) => Promise<{ url: string, id: string }>
 *   eliminar(id: string) => Promise<void>
 *   miniatura(url: string, ancho: number) => string   // URL liviana para listas
 *
 * Los servicios solo conocen este contrato, nunca al proveedor concreto.
 */
export class AlmacenamientoImagenes {
  async subir(_buffer, _nombre) { throw new Error('No implementado'); }
  async eliminar(_id) { throw new Error('No implementado'); }
  miniatura(url, _ancho) { return url; }
}
