import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { usuarios, productores } from '../db/schema.js';

export const usuarioRepository = {
  buscarPorEmail: (email) => db.query.usuarios.findFirst({ where: eq(usuarios.email, email), with: { productor: true } }),
  buscarPorId: (id) => db.query.usuarios.findFirst({
    where: eq(usuarios.id, id),
    columns: { passwordHash: false },
    with: { productor: { with: { municipio: true } } },
  }),
  crear: (datos, tx = db) => tx.insert(usuarios).values(datos).returning().then((r) => r[0]),
  crearProductor: (datos, tx = db) => tx.insert(productores).values(datos).returning().then((r) => r[0]),
};
