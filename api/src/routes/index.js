import { Router } from 'express';
import multer from 'multer';
import { verificarToken, verificarRol } from '../middlewares/auth.js';
import { validar } from '../middlewares/validar.js';
import {
  registroSchema, loginSchema, productoSchema, catalogoQuery, pedidoSchema, estadoSchema, calificacionSchema,
} from '../schemas.js';
import { authController } from '../controllers/authController.js';
import { catalogoController } from '../controllers/catalogoController.js';
import { misProductosController } from '../controllers/misProductosController.js';
import { pedidoController } from '../controllers/pedidoController.js';
import { adminController } from '../controllers/adminController.js';

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)),
});

const r = Router();
const productor = [verificarToken, verificarRol('PRODUCTOR')];
const comprador = [verificarToken, verificarRol('COMPRADOR')];
const admin = [verificarToken, verificarRol('ADMIN')];

// Autenticación
r.post('/auth/registro', validar(registroSchema), authController.registro);
r.post('/auth/login', validar(loginSchema), authController.login);
r.get('/auth/yo', verificarToken, authController.yo);

// Listas públicas para filtros
r.get('/categorias', catalogoController.categorias);
r.get('/municipios', catalogoController.municipios);

// Catálogo (comprador o visitante)
r.get('/productos', validar(catalogoQuery, 'query'), catalogoController.productos);
r.get('/productos/:id', catalogoController.producto);
r.get('/productores/:id', catalogoController.productor);

// Productos del productor
r.get('/mis-productos', ...productor, misProductosController.listar);
r.post('/mis-productos', ...productor, validar(productoSchema), misProductosController.crear);
r.put('/mis-productos/:id', ...productor, validar(productoSchema), misProductosController.actualizar);
r.delete('/mis-productos/:id', ...productor, misProductosController.eliminar);
r.post('/mis-productos/:id/foto', ...productor, subida.single('foto'), misProductosController.foto);

// Pedidos
r.post('/pedidos', ...comprador, validar(pedidoSchema), pedidoController.crear);
r.get('/pedidos', verificarToken, pedidoController.listar);
r.get('/pedidos/:id', verificarToken, pedidoController.detalle);
r.patch('/pedidos/:id/estado', ...productor, validar(estadoSchema), pedidoController.estado);
r.post('/pedidos/:id/calificacion', ...comprador, validar(calificacionSchema), pedidoController.calificar);

// Administración
r.get('/admin/productores', ...admin, adminController.productores);
r.patch('/admin/productores/:id/verificar', ...admin, adminController.verificar);
r.patch('/admin/productos/:id/ocultar', ...admin, adminController.ocultar);

export default r;
