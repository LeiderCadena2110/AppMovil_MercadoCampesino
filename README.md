# Mercado Campesino Digital

App Android que conecta campesinos de Nariño con compradores de Pasto.

| Carpeta | Qué es | Tecnología |
| --- | --- | --- |
| `api/` | API REST | Node.js + Express 5 + Drizzle ORM + PostgreSQL (Neon) |
| `app/` | App móvil (y panel web `/admin`) | Angular 21 + Ionic 9 + Capacitor 8 |

Usuarios de prueba (después del `db:seed`), todos con la contraseña `Clave1234`:

| Correo | Rol |
| --- | --- |
| comprador@demo.co | Comprador |
| productor@demo.co | Productor |
| admin@demo.co | Administrador (entra a `/admin`) |

---

## 1. Requisitos

- Node.js 22 LTS o superior
- Una cuenta gratis en [Neon](https://neon.tech)
- Android Studio (solo para generar el APK)

## 2. Base de datos en Neon

1. En Neon crea un proyecto (región más cercana: `us-east`).
2. En **Connection string** copia dos cadenas:
   - con **Pooled connection** activado → `DATABASE_URL`
   - con **Pooled connection** desactivado → `DIRECT_URL`

## 3. API

```bash
cd api
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# edita .env y pega DATABASE_URL, DIRECT_URL y un JWT_SECRET
npm run db:migrar           # crea las tablas en Neon
npm run db:seed             # municipios, categorías y usuarios de prueba
npm run dev                 # http://localhost:3000/api
npm test                    # prueba el flujo completo (usa la base del .env)
```

Fotos: si `CLOUDINARY_URL` está vacío, se guardan en `api/uploads/`. Para usar Cloudinary,
pega en `.env` la variable "API environment variable" de tu cuenta.

Si cambias `src/db/schema.js`: `npm run db:generar` crea la migración y `npm run db:migrar` la aplica.

## 4. App en el navegador

```bash
cd app
npm install
npm start                   # http://localhost:4200
```

## 5. App en Android

1. En `app/src/environments/environment.ts` pon la URL de la API:
   - emulador de Android Studio: `http://10.0.2.2:3000/api`
   - teléfono real en la misma wifi: `http://IP-DE-TU-PC:3000/api`
2. Genera y abre el proyecto:
   ```bash
   npm run android          # compila, sincroniza y abre Android Studio
   ```
3. En Android Studio: elige el emulador o tu teléfono y pulsa **Run ▶**.
   El APK para instalar: **Build › Build App Bundle(s) / APK(s) › Build APK(s)**.

## Estructura

```
api/src/
├── config/        variables de entorno
├── db/            schema.js (modelo de datos) e index.js (conexión)
├── routes/        rutas de la API
├── controllers/   reciben la petición y responden
├── services/      reglas de negocio (stock, estados del pedido)
├── repositories/  consultas a la base con Drizzle
├── storage/       AlmacenamientoImagenes → CloudinaryStorage / LocalStorage
└── middlewares/   verificarToken, verificarRol, validar, manejarErrores

app/src/app/
├── core/          servicios, guards, interceptor, modelos
├── shared/        tarjeta de producto, pedidos (lista y detalle), formatos
├── auth/          bienvenida, login, registro
├── comprador/     pestañas: inicio, buscar, carrito, pedidos, perfil
├── productor/     pestañas: panel, productos, pedidos, perfil
├── perfil/        perfil compartido
└── admin/         panel web /admin
```

## Pendiente para la siguiente iteración

- Recuperar contraseña por correo
- Notificaciones push (Firebase Cloud Messaging)
- Publicar la API (Render o Railway) y cambiar `environment.ts` a esa URL con https
