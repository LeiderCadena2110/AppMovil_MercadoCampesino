import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { AlmacenamientoImagenes } from './AlmacenamientoImagenes.js';
import { env } from '../config/env.js';

// Solo para desarrollo: guarda las fotos en la carpeta uploads/ del servidor.
export class LocalStorage extends AlmacenamientoImagenes {
  constructor(carpeta = path.resolve('uploads')) {
    super();
    this.carpeta = carpeta;
  }

  async subir(buffer, nombre) {
    await mkdir(this.carpeta, { recursive: true });
    const archivo = `${nombre}.jpg`;
    await writeFile(path.join(this.carpeta, archivo), buffer);
    return { url: `${env.urlPublica}/uploads/${archivo}`, id: archivo };
  }

  async eliminar(id) {
    await rm(path.join(this.carpeta, id), { force: true });
  }
}
