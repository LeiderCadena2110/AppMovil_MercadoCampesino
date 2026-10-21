// Datos de ejemplo: municipios de Nariño, categorías y tres usuarios de prueba.
import bcrypt from 'bcryptjs';
import { db, pool } from '../src/db/index.js';
import { municipios, categorias, usuarios, productores, productos } from '../src/db/schema.js';

const MUNICIPIOS = ['Pasto', 'Ipiales', 'Túquerres', 'La Unión', 'Sandoná', 'Buesaco', 'Tangua', 'Yacuanquer', 'Samaniego', 'La Florida', 'Chachagüí', 'Consacá'];
const CATEGORIAS = [
  ['Frutas', 'nutrition'], ['Verduras', 'leaf'], ['Tubérculos', 'ellipse'], ['Granos', 'apps'],
  ['Lácteos', 'water'], ['Café', 'cafe'], ['Hierbas', 'flower'],
];

async function main() {
  await db.insert(municipios).values(MUNICIPIOS.map((nombre) => ({ nombre }))).onConflictDoNothing();
  await db.insert(categorias).values(CATEGORIAS.map(([nombre, icono]) => ({ nombre, icono }))).onConflictDoNothing();

  // En producción (Render) solo se cargan municipios y categorías, salvo que SEED_DEMO=true
  if (process.argv.includes('--solo-base') && process.env.SEED_DEMO !== 'true') {
    console.log('Municipios y categorías al día.');
    return;
  }

  const ms = await db.select().from(municipios);
  const cs = await db.select().from(categorias);
  const m = (n) => ms.find((x) => x.nombre === n).id;
  const c = (n) => cs.find((x) => x.nombre === n).id;
  const hash = await bcrypt.hash('Clave1234', 10);

  const existentes = await db.select({ email: usuarios.email }).from(usuarios);
  if (existentes.some((u) => u.email === 'productor@demo.co')) {
    console.log('Los usuarios de prueba ya existen; no se repiten.');
    return;
  }

  await db.insert(usuarios).values([
    { nombre: 'Administrador', email: 'admin@demo.co', passwordHash: hash, rol: 'ADMIN' },
    { nombre: 'Laura Compradora', email: 'comprador@demo.co', telefono: '3001112233', passwordHash: hash, rol: 'COMPRADOR' },
  ]);
  const [prodUser] = await db.insert(usuarios).values({
    nombre: 'Don Efraín Rosero', email: 'productor@demo.co', telefono: '3104445566', passwordHash: hash, rol: 'PRODUCTOR',
  }).returning();
  const [prod] = await db.insert(productores).values({
    usuarioId: prodUser.id, nombreFinca: 'Finca El Encano', municipioId: m('Pasto'), verificado: true,
    descripcion: 'Papa, cebolla y hortalizas cultivadas cerca a la Laguna de La Cocha.',
  }).returning();
  await db.insert(productos).values([
    { productorId: prod.id, categoriaId: c('Tubérculos'), nombre: 'Papa pastusa', precio: '45000', unidad: 'arroba', stock: 40 },
    { productorId: prod.id, categoriaId: c('Tubérculos'), nombre: 'Papa amarilla (criolla)', precio: '3500', unidad: 'libra', stock: 120 },
    { productorId: prod.id, categoriaId: c('Verduras'), nombre: 'Cebolla junca', precio: '2500', unidad: 'atado', stock: 60 },
    { productorId: prod.id, categoriaId: c('Verduras'), nombre: 'Zanahoria', precio: '2000', unidad: 'libra', stock: 80 },
    { productorId: prod.id, categoriaId: c('Lácteos'), nombre: 'Queso campesino', precio: '14000', unidad: 'libra', stock: 15 },
  ]);
  console.log('Datos de prueba creados. Contraseña de todos: Clave1234');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
