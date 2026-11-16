import { Router } from 'express';
import multer from 'multer';
import { verificarToken, verificarRol } from '../middlewares/auth.js';
import { validar } from '../middlewares/validate.js';
import {
  registroSchema, loginSchema, refreshSchema, productoSchema, catalogoQuery, pedidoSchema, pedidosQuery, estadoSchema, calificacionSchema,
  asistenteSchema, descripcionIaSchema, precioIaSchema, dictadoIaSchema, dispositivoSchema,
} from '../schemas.js';
import { limitePorUsuario } from '../middlewares/rateLimit.js';
import { limiteLogin, limiteRegistro, limiteSesion } from '../middlewares/authLimits.js';
import { authController } from '../controllers/authController.js';
import { catalogoController } from '../controllers/catalogController.js';
import { misProductosController } from '../controllers/myProductsController.js';
import { pedidoController } from '../controllers/orderController.js';
import { adminController } from '../controllers/adminController.js';
import { iaController } from '../controllers/aiController.js';
import { notificaciones } from '../services/notificationService.js';

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
r.post('/auth/registro', limiteRegistro, validar(registroSchema), authController.registro);
r.post('/auth/login', limiteLogin, validar(loginSchema), authController.login);
r.post('/auth/refresh', limiteSesion, validar(refreshSchema), authController.refrescar);
r.post('/auth/logout', limiteSesion, validar(refreshSchema), authController.salir);
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
r.get('/pedidos', verificarToken, validar(pedidosQuery, 'query'), pedidoController.listar);
r.get('/pedidos/resumen', ...productor, pedidoController.resumen);
r.get('/pedidos/:id', verificarToken, pedidoController.detalle);
r.patch('/pedidos/:id/estado', ...productor, validar(estadoSchema), pedidoController.estado);
r.post('/pedidos/:id/calificacion', ...comprador, validar(calificacionSchema), pedidoController.calificar);

// Notificaciones push: el teléfono registra su token al iniciar sesión y lo borra al salir
r.post('/dispositivos', verificarToken, validar(dispositivoSchema), async (req, res) => {
  await notificaciones.registrarDispositivo(req.usuario.id, req.body);
  res.status(204).end();
});
r.delete('/dispositivos', verificarToken, validar(dispositivoSchema.pick({ token: true })), async (req, res) => {
  await notificaciones.quitarDispositivo(req.usuario.id, req.body.token);
  res.status(204).end();
});

// Inteligencia artificial (requiere sesión; máx. 15 consultas por minuto por usuario)
const limiteIa = limitePorUsuario({ maximo: 15, ventanaMs: 60_000 });
r.get('/ia/estado', iaController.estado);
r.post('/ia/asistente', verificarToken, limiteIa, validar(asistenteSchema), iaController.asistente);
r.post('/ia/descripcion', ...productor, limiteIa, validar(descripcionIaSchema), iaController.descripcion);
r.post('/ia/dictado', ...productor, limiteIa, validar(dictadoIaSchema), iaController.dictado);
r.post('/ia/foto', ...productor, limiteIa, subida.single('foto'), iaController.foto);
r.post('/ia/precio', ...productor, validar(precioIaSchema), iaController.precio);

// Administración
r.get('/admin/productores', ...admin, adminController.productores);
r.patch('/admin/productores/:id/verificar', ...admin, adminController.verificar);
r.patch('/admin/productos/:id/ocultar', ...admin, adminController.ocultar);

export default r;
