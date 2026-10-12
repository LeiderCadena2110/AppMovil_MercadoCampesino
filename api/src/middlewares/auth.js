import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ErrorApp } from './errores.js';

export function verificarToken(req, _res, next) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) return next(new ErrorApp(401, 'Debes iniciar sesión'));
  try {
    const datos = jwt.verify(token, env.jwtSecret);
    req.usuario = { id: datos.sub, rol: datos.rol, productorId: datos.productorId ?? null };
    next();
  } catch {
    next(new ErrorApp(401, 'Sesión vencida o inválida'));
  }
}

export const verificarRol = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.usuario?.rol)) return next(new ErrorApp(403, 'No tienes permiso para esta acción'));
  next();
};
