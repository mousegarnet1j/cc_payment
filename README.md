# Demo educativa de phishing — Modal de pago falso

Proyecto educativo para concientizar sobre fraudes de pago. **No es un scam:** todos los
datos son ficticios (tarjeta de prueba 4242 4242 4242 4242), se muestra un banner de
"entorno simulado" y no hay ninguna página de tienda o pago real.

## Requisitos

- Node.js 18+
- Redis corriendo: `redis-server` (o `docker run -p 6379:6379 redis`)

## Configuración

1. `npm install`
2. Crear `.env.local`:
   - `TELEGRAM_BOT_TOKEN=<token del bot>` (crear/rotar en BotFather)
   - `TELEGRAM_GROUP_ID=<id del grupo donde el bot postea>`
   - `REDIS_URL` (opcional)
3. `npm run dev` → abrir `http://localhost:3000`

## Correr la demo

1. `npm run dev`
2. Túnel HTTPS para el webhook:
   - `ngrok http 3000`
   - o `cloudflared tunnel --url http://localhost:3000`
3. Registrar el webhook con la URL del túnel:
   - `npm run set-webhook -- https://abc123.ngrok.io`
4. Abrir la página, pulsar "Abrir simulación" y operar el bot desde la app de Telegram
   (p. ej. "Pedir OTP" → el modal pide el código → "✅ Check" → PAGO APROBADO).
5. Al terminar: `npm run set-webhook -- --clear`

## Notas de seguridad

- El token vive solo en `.env.local` (gitignored). Si se comparte en un chat, rotarlo.
- Los datos enviados al bot son siempre el mock quemado (4242...); ningún participante
  ingresa datos reales de tarjeta.
- `/api/bin/validate` y `/api/telegram/sendMessageLogs` requieren credenciales propias
  (`API_BIN_TOKEN`, `TELEGRAM_BOT_TOKEN_LOGS`) y **no** se usan en el demo.

## Tests

`npm test` (Vitest: Luhn, `cn()`, `CheckCardService`).