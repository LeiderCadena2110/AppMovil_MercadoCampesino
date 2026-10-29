import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Agrega el token a cada petición y cierra la sesión si la API responde 401 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token) auth.salir();
      return throwError(() => err);
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
