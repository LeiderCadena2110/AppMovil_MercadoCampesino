import 'dotenv/config';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (revisa el archivo .env)`);
  return valor;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida('DATABASE_URL'),
  jwtSecret: requerida('JWT_SECRET'),
  jwtExpira: process.env.JWT_EXPIRA ?? '7d',
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
  urlPublica: process.env.URL_PUBLICA ?? `http://localhost:${process.env.PORT ?? 3000}`,
  corsOrigen: process.env.CORS_ORIGEN ?? '*',
};
