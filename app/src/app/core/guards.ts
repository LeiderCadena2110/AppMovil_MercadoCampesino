import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './models';

/** Solo entra quien inició sesión */
export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() || inject(Router).parseUrl('/bienvenida');
};

/** Solo entra el rol indicado; si no, va a su propio inicio */
export const rolGuard = (rol: Rol): CanMatchFn => () => {
  const auth = inject(AuthService);
  const u = auth.usuario();
  if (!u) return inject(Router).parseUrl('/bienvenida');
  return u.rol === rol || inject(Router).parseUrl(auth.inicioDe(u.rol));
};

/** Pantallas de acceso: si ya hay sesión, redirige al inicio del rol */
export const invitadoGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return !auth.autenticado() || inject(Router).parseUrl(auth.inicioDe(auth.usuario()?.rol));
};
