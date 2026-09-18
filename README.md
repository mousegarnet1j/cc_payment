# Demo educativa de phishing — Modal de pago falso

Proyecto educativo para concientizar sobre fraudes de pago. **No es un scam:** todos los
datos son ficticios (tarjeta de prueba 4242 4242 4242 4242) y el modal se incrusta como iframe
transparente sobre una página de tienda simulada, sin ninguna tienda o pago real.

## Requisitos

- Node.js 18+
- Redis corriendo: `redis-server` (o `docker run -p 6379:6379 redis`)

## Configuración

1. `npm install`
2. Crear `.env.local`:
   - `TELEGRAM_BOT_TOKEN=<token del bot>` (crear/rotar en BotFather)
   - `TELEGRAM_GROUP_ID=<id del grupo donde el bot postea>`
   - `REDIS_URL` (opcional)
   - `PAYLOAD_SECRET=<hex 32 bytes>` (generar con `openssl rand -hex 32`)
3. `npm run dev` → abrir `http://localhost:3000`

## Uso como iframe

1. `npm run dev`
2. Túnel HTTPS para el webhook:
   - `ngrok http 3000`
   - o `cloudflared tunnel --url http://localhost:3000`
3. Registrar el webhook con la URL del túnel:
   - `npm run set-webhook -- https://abc123.ngrok.io`
4. Abrir `http://localhost:3000/generator`, completar los datos (precargados con el mock 4242...) y
   las URLs de redirección, y pulsar "Generar URL del iframe". Copiar el snippet `<iframe>`.
5. Pegar el snippet en la página de la tienda. El iframe es transparente y a pantalla completa:
   la tienda se ve de fondo oscurecida al 50% y el modal aparece centrado encima.
6. Operar el bot desde la app de Telegram (p. ej. "Pedir OTP" → el modal pide el código → "✅ Check"
   → el modal redirige a la URL de éxito). "Use Another Card" redirige a la URL de declinado.
7. Al terminar: `npm run set-webhook -- --clear`

Los datos viajan cifrados en la URL (`?d=<token>`, AES-256-GCM) y se descifran server-side, de modo
que no aparecen en claro ni en la URL ni en el bundle JS.

## Notas de seguridad

- El token y `PAYLOAD_SECRET` viven solo en `.env.local` (gitignored). Si un token se comparte en un
  chat, rotarlo.
- Los datos enviados al bot son siempre el mock quemado (4242...); ningún participante ingresa datos
  reales de tarjeta.
- `/api/bin/validate` y `/api/telegram/sendMessageLogs` requieren credenciales propias
  (`API_BIN_TOKEN`, `TELEGRAM_BOT_TOKEN_LOGS`) y **no** se usan en el demo.

## Tests

`npm test` (Vitest: Luhn, `cn()`, `CheckCardService`, `payloadCipher`).