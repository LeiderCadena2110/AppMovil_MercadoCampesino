import { ErrorApp } from './errores.js';

// Límite simple de peticiones por usuario (en memoria). Protege la cuota gratis de la IA.
export function limitePorUsuario({ maximo, ventanaMs }) {
  const registros = new Map(); // usuarioId -> [marcas de tiempo]
  return (req, _res, next) => {
    const clave = req.usuario?.id ?? req.ip;
    const ahora = Date.now();
    const recientes = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
    if (recientes.length >= maximo) {
      return next(new ErrorApp(429, 'Has hecho muchas preguntas seguidas. Espera un minuto e inténtalo de nuevo.'));
    }
    recientes.push(ahora);
    registros.set(clave, recientes);
    next();
  };
}
