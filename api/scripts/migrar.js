// Aplica las migraciones de drizzle/ usando solo dependencias de producción.
// Lo usa el servidor (Render, Railway...) antes de arrancar: `npm run migrar:prod`.
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../src/db/index.js';

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migraciones al día.');
} catch (e) {
  console.error('No se pudieron aplicar las migraciones:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
