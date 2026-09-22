# Diseño: migración a App Router + estructura por tipo de archivo

Fecha: 2026-09-21

## Problema

El proyecto usa Pages Router (`src/pages/`) con una estructura mixta (por tipo y por dominio sin
convención clara):

```
src/
  components/   PaymentStatusModal.tsx (2724 líneas)
  lib/          rsaCipher, sessionCredentials, antiSpam, binMeta, webhookRegistration, redis, luhn, comercio (+tests)
  pages/        index, generator, info, _app, _document, api/** (9 rutas)
  services/     checkCardService, bin/, telegram/
  styles/       globals.css, paymentStatusModal.css
  types/        bin.t.ts, white.t.ts
  utils/        cn, formatNumber, auth, paymentStorage
```

`utils/` y `styles/` están separados de `lib/` y de sus componentes sin motivo; `PaymentStatusModal`
acumula lógica client (polling, resolución de BIN, localStorage, envío de mensajes). El objetivo es
una estructura homogénea **por tipo de archivo** y migrar el router a App Router.

## Objetivo

Reorganizar `src/` bajo carpetas por tipo de archivo y migrar de Pages Router a App Router:

```
src/
  app/          # router (App Router: layout, pages, api route handlers)
  components/   # componentes React (PaymentStatusModal, CheckoutClient, CSS co-locado)
  hooks/        # vacío por ahora (.gitkeep)
  lib/          # lib/* + utils/* fusionados (cn, formatNumber, auth, paymentStorage)
  providers/    # vacío por ahora (.gitkeep)
  services/     # sin cambios (checkCardService, bin/, telegram/)
  types/        # sin cambios
  constants/    # vacío por ahora (.gitkeep)
```

`utils/` y `styles/` se disuelven: `utils/*` → `lib/`, `globals.css` → `app/globals.css`,
`paymentStatusModal.css` → co-locado en `components/`.

## Decisiones de diseño

1. **Router**: migración completa a App Router. `src/pages/` desaparece. Las 9 rutas API se
   convierten a route handlers en `app/api/**/route.ts` manteniendo las mismas URLs (`/api/...`)
   para que los services client sigan apuntando a ellas sin cambios.
2. **Página de checkout como orquestador**: `app/page.tsx` es un server component que descifra el
   token (`searchParams`), valida y guarda credenciales de sesión; luego renderiza un client
   component `CheckoutClient` que contiene la lógica del viejo `Home` (resolución de BIN,
   localStorage, cardMeta/banco) y renderiza `<PaymentStatusModal />`. Así apps externas solo
   consumen `<PaymentStatusModal />`.
3. **`hooks/`, `providers/`, `constants/`**: se crean vacíos con `.gitkeep`. No se extrae lógica de
   `PaymentStatusModal` en este cambio (solo se mueve el archivo).
4. **Webhook fire-and-forget**: `app/api/telegram/webhook/route.ts` responde 200 al instante y
   procesa en background con `after()` de `next/server` (estable en Next 15.5), preservando el
   comportamiento actual.
5. **Respuestas API preservadas**: los services client dependen de formas exactas (`{status}`,
   `{ok, skipped}`, `{result}`, texto plano en public-key). Se mantienen idénticas.
6. **Dinamismo App Router**: `app/page.tsx` y `app/info/page.tsx` son dinámicas (usan
   `searchParams`/`headers()`), se renderizan por request como hacía GSSP. No hay cache estático.
7. **Imports**: `PaymentStatusModal` usa imports relativos (`../services/...`, `../lib/comercio`)
   que siguen válidos al quedarse en `components/`. Tests con imports relativos (`./x`) se mueven
   junto a su fuente.

## Cambios por archivo

### 1. `src/app/layout.tsx` (crear)

Merge de `_app.tsx` + `_document.tsx`: metadata, `<html lang="en">`, `<body className="antialiased">`,
import de `./globals.css`.

### 2. `src/app/globals.css` (mover de `src/styles/globals.css`)

### 3. `src/app/page.tsx` (crear desde `src/pages/index.tsx`)

- Server component. Lee `searchParams.d` (token), descifra con `decryptEnvelope`, valida
  `isWellFormed`, llama `saveSessionCredentials`, renderiza `<CheckoutClient ... />`.
- Lógica client del viejo `Home` (estados, efectos, bin resolve) se mueve a
  `src/components/CheckoutClient.tsx`.

### 4. `src/components/CheckoutClient.tsx` (crear)

- `"use client"`. Contiene la lógica del viejo `Home`: estado `isOpen`, `cardMeta`, `banco`,
  efectos de localStorage + resolución de BIN, y renderiza `<PaymentStatusModal />`.

### 5. `src/app/generator/page.tsx` (crear desde `src/pages/generator.tsx`)

- Añadir `"use client"` en la primera línea.

### 6. `src/app/info/page.tsx` (crear desde `src/pages/info.tsx`)

- Server component. GSSP → cuerpo del componente: `headers()` de `next/headers` para
  `x-forwarded-proto`/`host`, `getPublicKeyPem()`. El resto del JSX se conserva.

### 7. `src/app/api/**/route.ts` (crear 9 rutas desde `src/pages/api/**`)

| Origen | Destino | Método |
|---|---|---|
| `pages/api/generate.ts` | `app/api/generate/route.ts` | POST |
| `pages/api/bin/lookup.ts` | `app/api/bin/lookup/route.ts` | GET |
| `pages/api/bin/luhn.ts` | `app/api/bin/luhn/route.ts` | GET |
| `pages/api/bin/validate.ts` | `app/api/bin/validate/route.ts` | POST |
| `pages/api/crypto/public-key.ts` | `app/api/crypto/public-key/route.ts` | GET |
| `pages/api/telegram/checkStatus.ts` | `app/api/telegram/checkStatus/route.ts` | GET |
| `pages/api/telegram/savePaymentState.ts` | `app/api/telegram/savePaymentState/route.ts` | POST |
| `pages/api/telegram/sendMessage.ts` | `app/api/telegram/sendMessage/route.ts` | POST |
| `pages/api/telegram/webhook.ts` | `app/api/telegram/webhook/route.ts` | POST |

Conversión: `NextApiRequest/NextApiResponse` → `NextRequest/NextResponse`; `req.query` →
`req.nextUrl.searchParams.get()`; `req.body` → `await req.json()`; método → función exportada;
`res.setHeader/send` → `new NextResponse(pem, { headers })`. Webhook usa `after()`.

### 8. `src/components/paymentStatusModal.css` (mover de `src/styles/paymentStatusModal.css`)

- Importado desde `PaymentStatusModal.tsx`.

### 9. `src/lib/*` (fusionar `utils/*`)

- `utils/cn.ts` → `lib/cn.ts`, `utils/cn.test.ts` → `lib/cn.test.ts`
- `utils/formatNumber.ts` → `lib/formatNumber.ts`
- `utils/auth.ts` → `lib/auth.ts`
- `utils/paymentStorage.ts` → `lib/paymentStorage.ts`
- Actualizar imports `@/utils/paymentStorage` → `@/lib/paymentStorage` (3 rutas telegram).

### 10. Carpetas vacías (crear)

- `src/hooks/.gitkeep`, `src/providers/.gitkeep`, `src/constants/.gitkeep`

### 11. Eliminar

- `src/pages/`, `src/utils/`, `src/styles/` (tras mover contenido).

## Actualización de dependencias (añadido 2026-09-21)

Se actualizan las dependencias a sus versiones estables/LTS junto con la migración a App Router,
para arrancar sobre el stack más reciente. Verificación: `npm test`, `npm run build`, `npm run lint`
sobre Pages Router **antes** de migrar (aisla el riesgo: versiones primero, router después).

### Versiones objetivo

| Paquete | Actual | Objetivo | Motivo |
|---|---|---|---|
| next | 15.5.25 | 16.3.5 | LTS activa; App Router con React 19.2+ |
| react / react-dom | 19.1.0 | 19.3.0 | Requisito de Next 16 (React 19.2+) |
| @types/react / @types/react-dom | ^19 | 19.3.0 | Alineados a React 19.3 |
| typescript | ^5 | 6.0.3 | **No TS 7**: `typescript-eslint@8.70` exige `<6.1.0` |
| eslint | ^9 | 9.39.5 (LTS) | ⚠️ **No ESLint 10**: `eslint-plugin-react@7.37.5` (bundled con eslint-config-next@16) rompe con ESLint 10 (`context.getFilename is not a function`). ESLint 9 es la línea LTS soportada |
| eslint-config-next | 15.5.25 | 16.3.5 | Alineado a Next 16; exporta flat configs nativos; peer `eslint >=9` |
| vitest | ^4.1.11 | 5.0.1 | Estable; peer `@types/node ^22` |
| @types/node | ^20 | ^22 | Peer de vitest 5; Node 22 LTS |
| tailwindcss / @tailwindcss/postcss | ^4 | 4.3.3 | Estable v4 |

`@eslint/eslintrc` se **elimina** de dependencias: ESLint 10 elimina eslintrc y `FlatCompat` es
incompatible con `eslint-config-next@16` (`TypeError: Converting circular structure to JSON`).
`eslint.config.mjs` se reescribe a native flat config usando los exports
`eslint-config-next/core-web-vitals` y `eslint-config-next/typescript`.

### Decisiones para Next 16

1. **Turbopack es el bundler default** → se elimina `--turbopack` de los scripts `dev`/`build`
   (`next dev`, `next build`).
2. **Async request APIs son obligatorias** (`await searchParams`, `await headers()`). El plan de
   migración **ya las usa** en `app/page.tsx` y `app/info/page.tsx` → no requiere cambios adicionales.
3. **`next lint` se elimina** en 16 → el script `lint` ya invoca `eslint` directo, sin cambios.
4. **Imágenes locales** (`/banks/*.png`, `/loading.gif`, svgs) sin query strings → no necesitan
   `images.localPatterns`. `minimumCacheTTL` (60s→4h) y otros defaults de `next/image` no afectan
   estas rutas estáticas con `width`/`height` explícitos.
5. **Sin middleware, `revalidateTag`, AMP, runtimeConfig, parallel routes** → sin cambios de config.
6. **Node v22.17.0** cumple el mínimo 20.9+. **tsconfig** no cambia para TS 6: no usa `baseUrl`,
   `paths` relativos (`./src/*`), `module: esnext`, `strict: true` ya presentes.
7. `after()` de `next/server` (webhook) es estable en 15.5+ y sigue en 16.
8. **ESLint 9.39.5 (LTS)**, no 10: ESLint 10 rompe `eslint-plugin-react@7.37.5` que viene con
   `eslint-config-next@16`. `eslint.config.mjs` pasa a native flat config (eslint-config-next@16
   exporta flat configs), se retira `@eslint/eslintrc`, y se añaden dos disables puntuales
   (`react-hooks/purity` en index.tsx, `react-hooks/set-state-in-effect` en generator.tsx) por
   reglas nuevas de react-hooks v7 — archivos que Task 2/3 migran igualmente.

## Fuera de alcance

- Extraer hooks/providers/constants de `PaymentStatusModal` (solo se mueve).
- Cambiar lógica de negocio, mensajes, estados o respuestas API.
- Migrar tests a `@/` imports (los relativos siguen funcionando).