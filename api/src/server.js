import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => console.log(`API de Mercado Campesino en http://localhost:${env.port}/api`));
