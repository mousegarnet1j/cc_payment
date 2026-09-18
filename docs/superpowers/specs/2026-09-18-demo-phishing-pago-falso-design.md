# Diseño: Demo educativa de phishing — Modal de pago falso

Fecha: 2026-09-18
Estado: Propuesto

## Contexto y objetivo

Construir un proyecto Next.js que sirva como **herramienta educativa de ciberseguridad** para concientizar a adultos mayores sobre cómo los atacantes ejecutan fraudes de pago (phishing bancario). El demo muestra, en vivo y en un entorno controlado, el flujo completo de un ataque: la víctima ingresa sus datos en un modal de "estado de pago", y el atacante (el presentador) los recibe e interactúa a través de un bot de Telegram.

Todo el material de origen proviene de archivos ZIP existentes en la carpeta del proyecto: el modal de estado de pago (`PaymentStatusModal.tsx`), servicios de Telegram, utilidades de BIN, tipos, estilos y logos de bancos. El código original se conserva en su mayor parte; lo que se modifica es la capa de infraestructura para hacerla segura y autocontenida.

## Restricciones de seguridad (pilares del demo)

El demo **no es un scam** por tres razones estructurales, además del uso exclusivo de datos ficticios:

1. **Datos quemados como mock.** El proyecto simula 100% el comportamiento real, pero toda la información sensible (tarjeta `4242 4242 4242 4242`, CVV, vencimiento, titular, email, celular) está **quemada/hardcodeada** y es **siempre la misma**. Estos datos se precargan en `localStorage` (`checkout_payment`); **nadie los tipea**. Los participantes solo ingresan lo que el modal pide (p. ej. un OTP de prueba), y eso es lo único que viaja hacia el bot.
2. **No conectado a una tienda ni a un pago real.** No hay página de tienda, factura ni checkout simulado; solo la página de demo con el modal. No se induce a nadie a ingresar datos reales.
3. **Banner de entorno simulado siempre visible** en la página principal (y no se puede ocultar), advirtiendo que es una demo educativa.

Además:

4. **Secrets solo en `.env.local`** (gitignored). `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` jamás van en código fuente ni en repositorio.
5. **Rutas de BIN (`lookup`, `luhn`, `validate`) simuladas** (sin llamadas a `lookup.binlist.net`).
6. **Exposición mínima:** el webhook de Telegram solo es alcanzable durante la presentación a través de un túnel HTTPS (ngrok/cloudflared) y con el webhook registrado bajo demanda.
7. **Rotación del token:** el token compartido por chat se considera comprometido; el presentador debe rotarlo en BotFather antes de usar.

## Stack y herramientas

- Next.js 15 (App Router) + TypeScript, creado con `create-next-app` (incluye `src/`, Tailwind y alias `@/*` → `src/*`).
- Tailwind CSS (versión que instale `create-next-app`).
- `clsx` + `tailwind-merge` para merge de clases, con helper `cn()` en `src/utils/cn.ts`.
- `ioredis` para el estado de sesión (Redis local, fiel al original).
- El cliente de Telegram y las utilidades BIN simuladas son código propio.

## Estructura del proyecto

```
cc_payment/
├── .env.local                      # TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (gitignored)
├── .env.example                    # variables documentadas sin valores
├── scripts/
│   └── set-webhook.mjs             # registra/limpia el webhook del bot (npm run set-webhook)
├── public/
│   └── banks/                      # 23 logos de bancos (material original intacto)
└── src/
    ├── app/
    │   ├── layout.tsx              # layout raíz
    │   ├── page.tsx                # página demo (banner + botón + guía del presentador)
    │   ├── globals.css             # estilos Tailwind
    │   └── api/
    │       ├── telegram/
    │       │   ├── webhook/route.ts          # bucle interactivo (webhook.ts original)
    │       │   ├── sendMessage/route.ts      # publica en el chat real del bot
    │       │   ├── savePaymentState/route.ts # persiste estado en Redis
    │       │   ├── checkStatus/route.ts      # poll del modal (estado de sesión)
    │       │   └── sendMessageLogs/route.ts  # logs → chat real
    │       └── bin/
    │           ├── lookup/route.ts           # simulado (respuesta fija para 4242)
    │           ├── luhn/route.ts             # cálculo Luhn local
    │           └── validate/route.ts         # simulado
    ├── components/
    │   ├── payment-status-modal/
    │   │   └── PaymentStatusModal.tsx        # modal original, imports ajustados a @/
    │   └── SimulatedEnvironmentBanner.tsx    # banner rojo fijo
    ├── services/
    │   ├── telegram/
    │   │   ├── sendMessage.ts                # wrapper original (fetch a /api/...)
    │   │   ├── savePaymentState.ts           # wrapper original
    │   │   └── sendMessageLogs.ts            # wrapper original
    │   ├── bin/
    │   │   ├── luhn.ts                       # wrapper original
    │   │   └── validate.ts                   # wrapper original
    │   └── checkCardService.ts               # NUEVO, simulado (Visa para BIN 4242)
    ├── lib/
    │   ├── redis.ts                          # cliente ioredis (Redis local)
    │   ├── telegram.ts                       # cliente real del bot (sendMessage, answerCallback, edit...)
    │   └── binData.ts                        # respuestas BIN simuladas
    ├── utils/
    │   ├── paymentStorage.ts                 # original, usa ioredis
    │   ├── auth.ts                           # original
    │   ├── formatNumber.ts                   # original
    │   └── cn.ts                             # NUEVO: clsx + tailwind-merge
    ├── types/
    │   ├── bin.t.ts                          # original
    │   └── white.t.ts                        # original
    └── styles/
        └── paymentStatusModal.css            # original
```

## Flujo interactivo (el teatro del ataque)

Los datos de tarjeta están **quemados como mock** y precargados en `localStorage` (`checkout_payment`); nadie los tipea. Los participantes solo ingresan el OTP u otro valor que el modal pida.

1. La página demo genera un `sessionId` fresco (p. ej. `demo-<timestamp>`) y precarga en `localStorage` (`checkout_payment`) el mock fijo: `4242 4242 4242 4242`, CVV `123`, vencimiento `12/28`, titular ficticio, email y celular ficticios.
2. El presentador abre el modal. Al abrirlo, el modal valida la tarjeta (`checkCardService` → respuesta simulada "Visa") y publica el mensaje de "nuevo pago" en el chat del bot vía `/api/telegram/sendMessage` (llamada real a `api.telegram.org`), con botones de control inline.
3. El modal hace polling de `/api/telegram/checkStatus?sessionId=...` cada 2 s.
4. El presentador pulsa un botón en la app de Telegram (p. ej. "Pedir OTP"). Telegram envía el `callback_query` a `/api/telegram/webhook`.
5. El webhook lee el `Session ID` del texto del mensaje, guarda el nuevo estado en Redis y edita el mensaje en Telegram (p. ej. "📌 ESTADO: SE SOLICITÓ OTP"), respondiendo el callback.
6. En el siguiente poll, el modal detecta el estado `otp` y muestra el input correspondiente.
7. El participante (voluntario) escribe un OTP de prueba (p. ej. `123456`); el modal lo publica en el chat del bot.
8. El presentador pulsa "✅ Check" → estado `finalized` → el modal muestra "PAGO APROBADO".

Estados soportados (del material original): `loading`, `otp`, `error_otp`, `user`, `error_user`, `error_password`, `new_card`, `code_sms`, `error_code_sms`, `code_email`, `error_code_email`, `token`, `error_token`, `clave_cajero`, `error_clave_cajero`, `clave_virtual`, `error_clave_virtual`, `confirmar_identidad`, `finalized`, `banned`.

## Integración del código existente

- **`PaymentStatusModal.tsx`** (2227 líneas) se conserva intacto. Solo se ajustan los imports relativos al alias `@/` (`@/styles/paymentStatusModal.css`, `@/services/telegram/sendMessage`, `@/services/telegram/savePaymentState`, `@/services/checkCardService`).
- **Wrappers de servicios** (`sendMessage.ts`, `savePaymentState.ts`, `sendMessageLogs.ts`, `bin/luhn.ts`, `bin/validate.ts`): se conservan intactos; siguen haciendo `fetch` a `/api/...`.
- **`webhook.ts`** → `/api/telegram/webhook/route.ts`, adaptado a Route Handler de App Router. Es la variante que responde el callback (`answerCallback`). `hook.ts` es un duplicado casi idéntico y **no** se ruteará (se omite del demo).
- **`utils/paymentStorage.ts`**: intacto, funciona contra `ioredis` (Redis local).
- **`types/*`, `styles/paymentStatusModal.css`, logos de bancos**: intactos.
- **`services/checkCardService.ts`** (no venía en los ZIP): se crea con el método `validateCard(card: string)` que devuelve `{ success, issuer, level, brand, type, country, infocc }` con respuesta simulada para la tarjeta de prueba (Visa).

## Componentes nuevos

- **`SimulatedEnvironmentBanner`**: banner fijo en la parte superior con fondo rojo: "⚠ ENTORNO SIMULADO — No ingrese datos reales. Demo educativa de ciberseguridad."
- **Página `page.tsx`**: incluye el banner, un título/contexto ("Así funciona un ataque de pago falso"), un botón que abre el modal (con props de prueba) y una guía breve del presentador (pasos en Telegram). Antes de abrir el modal, precarga en `localStorage` (`checkout_payment`) el mock fijo de datos (tarjeta, CVV, vencimiento, titular, email, celular). No se replica el chat del atacante en pantalla: el presentador proyecta la app de Telegram real.

## Rutas API

| Ruta | Tipo | Comportamiento |
|---|---|---|
| `POST /api/telegram/sendMessage` | Real | Llama a `sendMessage` de Telegram con `chat_id` de env; soporta `reply_markup` con el teclado inline. |
| `POST /api/telegram/savePaymentState` | Real (Redis) | Persiste `{sessionId, status}` en Redis (`EX` 30 min). |
| `GET /api/telegram/checkStatus` | Real (Redis) | Lee el estado de la sesión de Redis (devuelve `loading` si no existe). |
| `POST /api/telegram/sendMessageLogs` | Real | Publica logs en el chat (mensaje simple). |
| `POST /api/telegram/webhook` | Real (recepción) | Procesa `callback_query`: mapea `data` → estado, guarda en Redis, edita el mensaje en Telegram, responde el callback. |
| `GET /api/bin/lookup?bin=` | Simulado | Devuelve datos fijos para BIN 4242 (Visa); genérico en otro caso. Sin llamadas externas. |
| `GET /api/bin/luhn?bin=` | Local | Valida con algoritmo Luhn localmente. |
| `POST /api/bin/validate` | Simulado | Devuelve resultado simulado de validación. |

## Scripts de soporte

- `npm run set-webhook` → `scripts/set-webhook.mjs`: registra el webhook del bot (`setWebhook`) con la URL del túnel (se pasa como argumento o por prompt). Soporta `--clear` para eliminar el webhook al terminar la demo.
- Redis local: requiere un servidor Redis corriendo (`redis-server` o `docker run -p 6379:6379 redis`). Opcionalmente `REDIS_URL` en `.env.local` (por defecto `redis://127.0.0.1:6379`).
- Documentación en `README.md`: pasos para correr (`npm run dev`), levantar Redis, levantar el túnel (`ngrok http 3000` o `cloudflared tunnel --url http://localhost:3000`), registrar el webhook y limpiarlo.

## Verificación

1. Redis local corriendo (`redis-cli ping` → `PONG`).
2. `npm run build` y `npm run lint` sin errores.
3. Prueba manual del bucle completo: abrir la página, click en el botón, verificar que el modal publica el mensaje (con los datos mock quemados) en el chat del bot, pulsar "Pedir OTP" en Telegram, verificar que el modal cambia al estado OTP, ingresar un OTP de prueba, pulsar "✅ Check", verificar "PAGO APROBADO".
4. Verificar que no hay secrets en el código fuente ni en git.

## Fuera de alcance

- No se conectan los `hook.ts`/`webhook.ts` originales a un panel admin de "whites" (credenciales de víctimas reales).
- No se implementan el `auth.ts` real ni flujos de sesión de administrador.
- No hay página de tienda/factura simulada: el demo arranca desde la página principal del proyecto y nada induce a ingresar datos reales.
- No se simula el panel "Vista del atacante" en pantalla (se proyecta Telegram real).
- No se despliega a un host público; la exposición es solo vía túnel durante la demo.