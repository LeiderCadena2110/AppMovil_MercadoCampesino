# Mercado Campesino Digital

App Android que conecta campesinos de Nariño con compradores de Pasto.

[![CI](https://github.com/LeiderCadena2110/AppMovil_MercadoCampesino/actions/workflows/ci.yml/badge.svg)](https://github.com/LeiderCadena2110/AppMovil_MercadoCampesino/actions/workflows/ci.yml)
[![APK Android](https://github.com/LeiderCadena2110/AppMovil_MercadoCampesino/actions/workflows/android-apk.yml/badge.svg)](https://github.com/LeiderCadena2110/AppMovil_MercadoCampesino/actions/workflows/android-apk.yml)

**Descargar el APK:** [Releases](https://github.com/LeiderCadena2110/AppMovil_MercadoCampesino/releases/latest) ·
**Versión web:** https://leidercadena2110.github.io/AppMovil_MercadoCampesino/

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
   Para un APK que use la API publicada: `npm run android:prod` y luego compila en Android Studio.

## 6. Inteligencia artificial

| Función | Quién la usa | Dónde |
| --- | --- | --- |
| **Campi**, asistente de compras: arma el mercado con un presupuesto, propone recetas nariñenses y recomienda productos reales del catálogo | Comprador | Inicio › "Pregúntale a Campi" |
| **Escribir con IA**: redacta o mejora la descripción del producto | Productor | Formulario de producto |
| **Sugerir precio**: rango y precio sugerido según productos parecidos publicados | Productor | Formulario de producto |

Usa **Google Gemini** (gratis). Crea la clave en https://aistudio.google.com/apikey y ponla en
`api/.env` como `GEMINI_API_KEY`. El modelo se cambia con `GEMINI_MODELO`.
Sin clave, todo sigue funcionando con un **modo local** más simple (búsqueda por palabras y recetas
guardadas), así la app nunca se queda sin respuesta. `GET /api/ia/estado` dice qué modo está activo.

Rutas: `POST /api/ia/asistente`, `POST /api/ia/descripcion`, `POST /api/ia/precio` (con sesión, máx. 15 por minuto).

## 7. Desplegar

### API en Render (gratis)
1. Entra a [Render](https://render.com) con tu cuenta de GitHub.
2. **New › Blueprint** y elige este repositorio: Render lee `render.yaml`.
3. Pega `DATABASE_URL` (Neon, pooled), `CLOUDINARY_URL` y `GEMINI_API_KEY`. `JWT_SECRET` se genera solo.
4. Al arrancar aplica las migraciones (`npm run start:prod`). Prueba `https://<tu-servicio>.onrender.com/api/salud`.
5. Si el nombre del servicio cambia, en GitHub ve a **Settings › Secrets and variables › Actions › Variables**
   y crea `API_URL` = `https://<tu-servicio>.onrender.com/api`. El APK y la web la usan al compilarse.

> El plan gratis de Render se duerme tras 15 min sin uso: la primera petición tarda ~1 minuto.

### APK automático (GitHub Actions)
- Cada push a `main` compila el APK (**Actions › APK Android › Artifacts**).
- Para publicarlo en **Releases**: crea una etiqueta (`git tag v1.2.0 && git push --tags`) o
  ejecuta el workflow a mano en **Actions › APK Android › Run workflow**.
- APK firmado (opcional, recomendado para Play Store): crea un keystore
  ```bash
  keytool -genkey -v -keystore mercado.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mercado
  base64 -w0 mercado.jks   # copia el resultado
  ```
  y en **Settings › Secrets › Actions** crea `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` y `KEY_PASSWORD`.
  Sin esos secretos se publica un APK de depuración, que igual se instala en cualquier Android.

### Versión web (GitHub Pages)
Una sola vez: **Settings › Pages › Source: GitHub Actions**. Después cada push a `main` la publica.

## Estructura

```
api/src/
├── config/        variables de entorno
├── db/            schema.js (modelo de datos) e index.js (conexión)
├── routes/        rutas de la API
├── controllers/   reciben la petición y responden
├── services/      reglas de negocio (stock, estados del pedido, IA)
├── ia/            cliente de Google Gemini
├── repositories/  consultas a la base con Drizzle
├── storage/       AlmacenamientoImagenes → CloudinaryStorage / LocalStorage
└── middlewares/   verificarToken, verificarRol, validar, manejarErrores

app/src/app/
├── core/          servicios, guards, interceptor, modelos
├── shared/        tarjeta de producto, pedidos (lista y detalle), formatos
├── auth/          bienvenida, login, registro
├── comprador/     pestañas: inicio, buscar, carrito, pedidos, perfil; asistente Campi
├── productor/     pestañas: panel, productos, pedidos, perfil
├── perfil/        perfil compartido
└── admin/         panel web /admin
```

## Pendiente para la siguiente iteración

- Recuperar contraseña por correo
- Notificaciones push (Firebase Cloud Messaging)
- Historial de compras para que Campi recomiende según lo que cada comprador pide seguido
