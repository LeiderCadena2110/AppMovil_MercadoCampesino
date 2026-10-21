import { ErrorApp } from './errors.js';

// Valida req.body (o req.query) con un esquema de zod y deja los datos limpios.
export const validar = (esquema, origen = 'body') => (req, _res, next) => {
  const r = esquema.safeParse(req[origen]);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `${i.path.join('.') || 'dato'}: ${i.message}`).join('; ');
    return next(new ErrorApp(400, detalle));
  }
  if (origen === 'body') req.body = r.data;
  else req.datos = r.data;
  next();
};
