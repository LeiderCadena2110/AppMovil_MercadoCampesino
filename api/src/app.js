import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { env } from './config/env.js';
import rutas from './routes/index.js';
import { manejarErrores, noEncontrado } from './middlewares/errors.js';

export const app = express();

// Detrás del proxy de Render/Railway: req.ip es la IP real del usuario
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigen }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '7d' }));

app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api', rutas);

app.use(noEncontrado);
app.use(manejarErrores);
