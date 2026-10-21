export class ErrorApp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export function noEncontrado(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, _req, res, _next) {
  if (err instanceof ErrorApp) return res.status(err.status).json({ error: err.message });
  if (err?.name === 'MulterError') return res.status(400).json({ error: `Archivo inválido: ${err.message}` });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
