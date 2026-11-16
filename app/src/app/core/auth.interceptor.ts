import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService, SIN_CONEXION, SIN_REINTENTO } from './auth.service';

/**
 * Agrega el token de acceso a cada petición. Si la API responde 401 (el token de 15 min venció),
 * pide uno nuevo con el refresh token y repite la petición una vez. Si el servidor rechaza
 * la sesión, la cierra; si no hay conexión, la conserva.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SIN_REINTENTO)) return next(req);
  const auth = inject(AuthService);
  const token = auth.token();
  const conToken = (t: string | null) => (t ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req);

  return next(conToken(token)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !token) return throwError(() => err);
      return from(auth.refrescar()).pipe(
        switchMap((nuevo) => {
          if (nuevo === SIN_CONEXION) return throwError(() => err); // sin internet: no se cierra la sesión
          if (!nuevo) {
            auth.salir();
            return throwError(() => err);
          }
          return next(conToken(nuevo));
        }),
      );
    }),
  );
};

/** Convierte cualquier error HTTP en un texto claro para mostrar */
export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Sin conexión con el servidor. Revisa tu internet.';
    return err.error?.error ?? `Error ${err.status}`;
  }
  // Errores propios de la app (validaciones) traen un mensaje pensado para el usuario
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error inesperado';
}
