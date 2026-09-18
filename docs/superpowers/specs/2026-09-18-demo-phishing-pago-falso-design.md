# Diseño: Demo educativa de phishing — Modal de pago falso

Fecha: 2026-09-18
Estado: Propuesto (rev 2)

## Contexto y objetivo

Construir un proyecto Next.js que sirva como **herramienta educativa de ciberseguridad** para concientizar a adultos mayores sobre cómo los atacantes ejecutan fraudes de pago (phishing bancario). El demo muestra, en vivo y en un entorno controlado, el flujo completo de un ataque: la víctima ingresa sus datos en un modal de "estado de pago", y el atacante (el presentador) los recibe e interactúa a través de un bot de Telegram.

**Principio rector: máxima fidelidad.** Todo el código que viene en los ZIP se usa **tal cual, sin modificar**. El proyecto reconstruye la estructura original del proyecto (Pages Router, alias `@/*` → `src/*`) para que los archivos caigan en su lugar exacto y funcionen sin retoques. Solo se crean las piezas que **faltan** en los ZIP (cliente Redis, `checkCardService`, handlers server de las rutas que los wrappers llaman), fieles al contrato que los archivos existentes ya esperan.

## Restricciones de seguridad (pilares del demo)

El demo **no es un scam** por tres razones estructurales, además del uso exclusivo de datos ficticios:

1. **Datos quemados como mock.** Toda la información sensible (tarjeta `4242 4242 4242 4242`, CVV, vencimiento, titular, email, celular) está **quemada/hardcodeada** y es **siempre la misma**. Se precargan en `localStorage` (`checkout_payment`); **nadie los tipea**. Los participantes solo ingresan lo que el modal pide (p. ej. un OTP de prueba), y eso es lo único que viaja hacia el bot.
2. **No conectado a una tienda ni a un pago real.** No hay página de tienda, factura ni checkout simulado; solo la página de demo con el modal. No se induce a nadie a ingresar datos reales.
3. **Banner de entorno simulado siempre visible** en la página principal (y no se puede ocultar), advirtiendo que es una demo educativa.

Además:

4. **Secrets solo en `.env.local`** (gitignored). `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` jamás van en código fuente ni en repositorio (los archivos originales ya leen `process.env.TELEGRAM_BOT_TOKEN`).
5. **Exposición mínima:** el webhook de Telegram solo es alcanzable durante la presentación a través de un túnel HTTPS (ngrok/cloudflared) y con el webhook registrado bajo demanda (`setWebhook` al presentar, `--clear` al terminar).
6. **Rotación del token:** el token compartido por chat se considera comprometido; el presentador debe rotarlo en BotFather antes de usar.

## Stack y herramientas

- Next.js 15 **Pages Router** (`create-next-app` con `--no-app --src-dir --import-alias "@/*"`) + TypeScript + Tailwind + ESLint.
- Alias `@/*` → `src/*`.
- `clsx` + `tailwind-merge` para merge de clases, con helper `cn()` en `src/utils/cn.ts`.
- `ioredis` para el estado de sesión (Redis local, fiel al original: `paymentStorage.ts` importa `redis` de `@/lib/redis`).
- Todo lo demás es el material original (modal, servicios, wrappers, tipos, estilos) o reconstrucción fiel de piezas faltantes.

## Estructura del proyecto

```
cc_payment/
├── .env.local                      # TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (gitignored)
├── .env.example                    # variables documentadas sin valores
├── scripts/
│   └── set-webhook.mjs             # registra/limpia el webhook (npm run set-webhook)
├── public/
│   └── banks/                      # 23 logos de bancos (material original intacto)
└── src/
    ├── pages/
    │   ├── index.tsx               # página demo (banner + botón + guía del presentador)
    │   └── api/
    │       ├── telegram/
    │       │   ├── webhook.ts          # webhook.ts original VERBATIM
    │       │   ├── hook.ts             # hook.ts original VERBATIM
    │       │   ├── checkStatus.ts      # checkStatus.ts original VERBATIM
    │       │   ├── sendMessage.ts      # NUEVO: handler server (contrato del wrapper)
    │       │   ├── savePaymentState.ts # NUEVO: handler server (contrato del wrapper)
    │       │   └── sendMessageLogs.ts  # NUEVO: handler server (contrato del wrapper)
    │       └── bin/
    │           ├── lookup.ts           # bin/lookup.ts original VERBATIM (usa lookup.binlist.net)
    │           ├── luhn.ts             # NUEVO: handler server (contrato del wrapper)
    │           └── validate.ts         # NUEVO: handler server (contrato del wrapper)
    ├── components/
    │   └── PaymentStatusModal.tsx  # modal original VERBATIM (imports relativos intactos)
    ├── services/
    │   ├── telegram/
    │   │   ├── sendMessage.ts          # wrapper original VERBATIM
    │   │   ├── savePaymentState.ts     # wrapper original VERBATIM
    │   │   └── sendMessageLogs.ts      # wrapper original VERBATIM
    │   ├── bin/
    │   │   ├── luhn.ts                 # wrapper original VERBATIM
    │   │   └── validate.ts             # wrapper original VERBATIM
    │   └── checkCardService.ts         # NUEVO: validateCard(card) → {success, issuer, level, brand, type, country, infocc}
    ├── lib/
    │   └── redis.ts                    # NUEVO: cliente ioredis (default export)
    ├── utils/
    │   ├── paymentStorage.ts           # original VERBATIM (usa @/lib/redis)
    │   ├── auth.ts                     # original VERBATIM
    │   ├── formatNumber.ts             # original VERBATIM
    │   └── cn.ts                       # NUEVO: clsx + tailwind-merge
    ├── types/
    │   ├── bin.t.ts                    # original VERBATIM
    │   └── white.t.ts                  # original VERBATIM
    └── styles/
        └── paymentStatusModal.css      # original VERBATIM
```

## Flujo interactivo (el teatro del ataque)

Los datos de tarjeta están **quemados como mock** y precargados en `localStorage` (`checkout_payment`); nadie los tipea. Los participantes solo ingresan el OTP u otro valor que el modal pida.

1. La página demo genera un `sessionId` fresco (p. ej. `demo-<timestamp>`) y precarga en `localStorage` (`checkout_payment`) el mock fijo: `4242 4242 4242 4242`, CVV `123`, vencimiento `12/28`, titular ficticio, email y celular ficticios.
2. El presentador abre el modal. Al abrirlo, el modal valida la tarjeta (`checkCardService` → respuesta para la 4242) y publica el mensaje de "nuevo pago" en el chat del bot vía `sendMessage` → `/api/telegram/sendMessage` (llamada real a `api.telegram.org`), con botones de control inline.
3. El modal hace polling de `/api/telegram/checkStatus?sessionId=...` cada 2 s.
4. El presentador pulsa un botón en la app de Telegram (p. ej. "Pedir OTP"). Telegram envía el `callback_query` a `/api/telegram/webhook`.
5. El webhook lee el `Session ID` del texto del mensaje, guarda el nuevo estado en Redis y edita el mensaje en Telegram (p. ej. "📌 ESTADO: SE SOLICITÓ OTP"), respondiendo el callback.
6. En el siguiente poll, el modal detecta el estado `otp` y muestra el input correspondiente.
7. El participante (voluntario) escribe un OTP de prueba (p. ej. `123456`); el modal lo publica en el chat del bot.
8. El presentador pulsa "✅ Check" → estado `finalized` → el modal muestra "PAGO APROBADO".

Estados soportados (del material original): `loading`, `otp`, `error_otp`, `user`, `error_user`, `error_password`, `new_card`, `code_sms`, `error_code_sms`, `code_email`, `error_code_email`, `token`, `error_token`, `clave_cajero`, `error_clave_cajero`, `clave_virtual`, `error_clave_virtual`, `confirmar_identidad`, `finalized`, `banned`.

## Integración del código existente (verbatim)

| Archivo original | Destino | Estado |
|---|---|---|
| `PaymentStatusModal.tsx` | `src/components/PaymentStatusModal.tsx` | Verbatim (imports relativos intactos: `../services/...`, `@/styles/...`) |
| `telegram/webhook.ts` | `src/pages/api/telegram/webhook.ts` | Verbatim |
| `telegram/hook.ts` | `src/pages/api/telegram/hook.ts` | Verbatim |
| `telegram/checkStatus.ts` | `src/pages/api/telegram/checkStatus.ts` | Verbatim |
| `telegram/sendMessage.ts` | `src/services/telegram/sendMessage.ts` | Verbatim |
| `telegram/savePaymentState.ts` | `src/services/telegram/savePaymentState.ts` | Verbatim |
| `telegram/sendMessageLogs.ts` | `src/services/telegram/sendMessageLogs.ts` | Verbatim |
| `bin/lookup.ts` | `src/pages/api/bin/lookup.ts` | Verbatim (usa `lookup.binlist.net`) |
| `bin/luhn.ts` | `src/services/bin/luhn.ts` | Verbatim |
| `bin/validate.ts` | `src/services/bin/validate.ts` | Verbatim |
| `utils/paymentStorage.ts` | `src/utils/paymentStorage.ts` | Verbatim (usa `@/lib/redis`) |
| `utils/auth.ts` | `src/utils/auth.ts` | Verbatim |
| `utils/formatNumber.ts` | `src/utils/formatNumber.ts` | Verbatim |
| `types/bin.t.ts` | `src/types/bin.t.ts` | Verbatim |
| `types/white.t.ts` | `src/types/white.t.ts` | Verbatim |
| `styles/paymentStatusModal.css` | `src/styles/paymentStatusModal.css` | Verbatim |
| `banks/*` (23) | `public/banks/` | Verbatim |

**Piezas faltantes que se reconstruyen (fieles al contrato existente):**
- `src/lib/redis.ts` → default export de un cliente `ioredis` (`new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')`). API `get/set/del` (con `{EX}`), que es la que `paymentStorage.ts` ya usa.
- `src/services/checkCardService.ts` → `CheckCardService.validateCard(card: string)`: valida con Luhn y devuelve `{ success, issuer, level, brand, type, country, infocc }` (el modal lee esas claves).
- Handlers server de los wrappers que hacen `fetch` a `/api/...`:
  - `POST /api/telegram/sendMessage` → llama a `api.telegram.org/bot<TOKEN>/sendMessage` con `chat_id` (de `TELEGRAM_CHAT_ID`/env), `text` y `reply_markup` si viene `keyboard`. Devuelve `{ result }`.
  - `POST /api/telegram/savePaymentState` → persiste `{sessionId, status}` en Redis (`EX` 30 min). Devuelve `{ result }`.
  - `POST /api/telegram/sendMessageLogs` → publica el log en el chat. Devuelve `{ result }`.
  - `GET /api/bin/luhn` → valida Luhn localmente (`{ message }`).
  - `POST /api/bin/validate` → validación simulada (`{ result }`).

## Componentes nuevos

- **Banner** en `src/pages/index.tsx`: fijo en la parte superior, fondo rojo, texto "⚠ ENTORNO SIMULADO — No ingrese datos reales. Demo educativa de ciberseguridad."
- **Página `src/pages/index.tsx`**: banner + título/contexto ("Así funciona un ataque de pago falso") + botón que abre el modal (con props y mock quemado precargado en `localStorage`) + guía breve del presentador (pasos en Telegram). No se replica el chat del atacante en pantalla: el presentador proyecta la app de Telegram real.

## Rutas API

| Ruta | Origen | Comportamiento |
|---|---|---|
| `POST /api/telegram/sendMessage` | Reconstruida | `sendMessage` de Telegram con `chat_id` de env; soporta `reply_markup`. |
| `POST /api/telegram/savePaymentState` | Reconstruida | Persiste `{sessionId, status}` en Redis (`EX` 30 min). |
| `GET /api/telegram/checkStatus` | Verbatim (`checkStatus.ts`) | Lee estado de Redis (devuelve `loading` si no existe). |
| `POST /api/telegram/sendMessageLogs` | Reconstruida | Publica logs en el chat. |
| `POST /api/telegram/webhook` | Verbatim (`webhook.ts`) | Procesa `callback_query`: mapea `data` → estado, guarda en Redis, edita mensaje en Telegram, responde callback. |
| `POST /api/telegram/hook` | Verbatim (`hook.ts`) | Variante del webhook (se conserva tal cual, no se usa en el demo). |
| `GET /api/bin/lookup?bin=` | Verbatim (`lookup.ts`) | Proxea a `lookup.binlist.net` (solo metadata pública del BIN de prueba). |
| `GET /api/bin/luhn?bin=` | Reconstruida | Validación Luhn local. |
| `POST /api/bin/validate` | Reconstruida | Validación simulada. |

## Scripts de soporte

- `npm run set-webhook` → `scripts/set-webhook.mjs`: registra el webhook del bot (`setWebhook`) con la URL del túnel (argumento o prompt). Soporta `--clear` para limpiarlo al terminar.
- Redis local: `redis-server` o `docker run -p 6379:6379 redis`. Opcionalmente `REDIS_URL` en `.env.local` (por defecto `redis://127.0.0.1:6379`).
- Documentación en `README.md`: `npm run dev`, levantar Redis, túnel (`ngrok http 3000` o `cloudflared tunnel --url http://localhost:3000`), registrar/limpiar webhook.

## Verificación

1. Redis local corriendo (`redis-cli ping` → `PONG`).
2. `npm run build` y `npm run lint` sin errores.
3. Prueba manual del bucle completo: abrir la página, click en el botón, verificar que el modal publica el mensaje (con los datos mock quemados) en el chat del bot, pulsar "Pedir OTP" en Telegram, verificar que el modal cambia al estado OTP, ingresar un OTP de prueba, pulsar "✅ Check", verificar "PAGO APROBADO".
4. Verificar que no hay secrets en el código fuente ni en git.

## Fuera de alcance

- No se conecta a un panel admin de "whites" (credenciales de víctimas reales): el demo solo usa el mock quemado.
- No hay página de tienda/factura simulada: el demo arranca desde la página principal del proyecto y nada induce a ingresar datos reales.
- No se replica el chat del atacante en pantalla (se proyecta Telegram real).
- No se despliega a un host público; la exposición es solo vía túnel durante la demo.