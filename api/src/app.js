import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { env } from './config/env.js';
import rutas from './routes/index.js';
import { pool } from './db/index.js';
import { tipoAlmacenamiento } from './storage/index.js';
import { iaService } from './services/aiService.js';
import { pushDisponible } from './push/fcm.js';
import { manejarErrores, noEncontrado } from './middlewares/errors.js';

export const app = express();

// Detrás del proxy de Render/Railway: req.ip es la IP real del usuario
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigen, exposedHeaders: ['Idempotent-Replayed', 'X-Hay-Mas'] }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '7d' }));

// Salud: Render la usa para saber si la API puede recibir tráfico (incluye la base de datos)
app.get('/api/salud', async (_req, res) => {
  const inicio = Date.now();
  let baseDatos = 'ok';
  try {
    await pool.query('select 1');
  } catch {
    baseDatos = 'sin conexión';
  }
  const ok = baseDatos === 'ok';
  res.status(ok ? 200 : 503).json({
    ok, baseDatos, fotos: tipoAlmacenamiento, ia: iaService.estado().proveedor,
    push: pushDisponible() ? 'firebase' : 'sin configurar', ms: Date.now() - inicio,
  });
});
app.use('/api', rutas);

app.use(noEncontrado);
app.use(manejarErrores);
