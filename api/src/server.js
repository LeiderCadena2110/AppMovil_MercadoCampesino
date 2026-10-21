import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => console.log(`API de Minga App en http://localhost:${env.port}/api`));
