import { Routes } from '@angular/router';
import { authGuard, invitadoGuard, rolGuard } from './core/guards';

const perfil = () => import('./perfil/perfil.page').then((m) => m.PerfilPage);
const pedidos = () => import('./shared/pedidos-lista.page').then((m) => m.PedidosListaPage);
const pedidoDetalle = () => import('./shared/pedido-detalle.page').then((m) => m.PedidoDetallePage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bienvenida' },

  // Acceso (sin sesión) — si ya hay sesión, invitadoGuard manda al inicio del rol
  { path: 'bienvenida', canMatch: [invitadoGuard], loadComponent: () => import('./auth/bienvenida.page').then((m) => m.BienvenidaPage) },
  { path: 'login', canMatch: [invitadoGuard], loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage) },
  { path: 'registro', canMatch: [invitadoGuard], loadComponent: () => import('./auth/registro.page').then((m) => m.RegistroPage) },

  // Comprador: 5 pestañas + pantallas apiladas
  {
    path: 'comprador',
    canMatch: [authGuard, rolGuard('COMPRADOR')],
    children: [
      {
        path: 'tabs',
        loadComponent: () => import('./comprador/tabs.page').then((m) => m.CompradorTabsPage),
        children: [
          { path: 'inicio', loadComponent: () => import('./comprador/inicio.page').then((m) => m.InicioPage) },
          { path: 'buscar', loadComponent: () => import('./comprador/buscar.page').then((m) => m.BuscarPage) },
          { path: 'carrito', loadComponent: () => import('./comprador/carrito.page').then((m) => m.CarritoPage) },
          { path: 'pedidos', loadComponent: pedidos },
          { path: 'perfil', loadComponent: perfil },
          { path: '', pathMatch: 'full', redirectTo: 'inicio' },
        ],
      },
      { path: 'producto/:id', loadComponent: () => import('./comprador/producto-detalle.page').then((m) => m.ProductoDetallePage) },
      { path: 'productor/:id', loadComponent: () => import('./comprador/productor-perfil.page').then((m) => m.ProductorPerfilPage) },
      { path: 'asistente', loadComponent: () => import('./comprador/asistente.page').then((m) => m.AsistentePage) },
      { path: 'checkout', loadComponent: () => import('./comprador/checkout.page').then((m) => m.CheckoutPage) },
      { path: 'pedido/:id', loadComponent: pedidoDetalle },
      { path: '', pathMatch: 'full', redirectTo: 'tabs/inicio' },
    ],
  },

  // Productor: 4 pestañas + pantallas apiladas
  {
    path: 'productor',
    canMatch: [authGuard, rolGuard('PRODUCTOR')],
    children: [
      {
        path: 'tabs',
        loadComponent: () => import('./productor/tabs.page').then((m) => m.ProductorTabsPage),
        children: [
          { path: 'panel', loadComponent: () => import('./productor/panel.page').then((m) => m.PanelPage) },
          { path: 'productos', loadComponent: () => import('./productor/mis-productos.page').then((m) => m.MisProductosPage) },
          { path: 'pedidos', loadComponent: pedidos },
          { path: 'perfil', loadComponent: perfil },
          { path: '', pathMatch: 'full', redirectTo: 'panel' },
        ],
      },
      { path: 'producto/nuevo', loadComponent: () => import('./productor/producto-form.page').then((m) => m.ProductoFormPage) },
      { path: 'producto/:id/editar', loadComponent: () => import('./productor/producto-form.page').then((m) => m.ProductoFormPage) },
      { path: 'pedido/:id', loadComponent: pedidoDetalle },
      { path: '', pathMatch: 'full', redirectTo: 'tabs/panel' },
    ],
  },

  // Administrador (panel web)
  { path: 'admin', canMatch: [authGuard, rolGuard('ADMIN')], loadComponent: () => import('./admin/admin.page').then((m) => m.AdminPage) },

  { path: '**', redirectTo: 'bienvenida' },
];
