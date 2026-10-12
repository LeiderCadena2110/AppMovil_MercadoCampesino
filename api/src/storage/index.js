import { env } from '../config/env.js';
import { CloudinaryStorage } from './CloudinaryStorage.js';
import { LocalStorage } from './LocalStorage.js';

// Único lugar donde se elige el proveedor. Para migrar a S3 o R2:
// crear S3Storage.js que extienda AlmacenamientoImagenes y cambiar esta línea.
export const almacenamiento = env.cloudinaryUrl ? new CloudinaryStorage() : new LocalStorage();
