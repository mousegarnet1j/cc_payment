# Demo educativa de phishing — Modal de pago falso

Proyecto educativo para concientizar sobre fraudes de pago. **No es un scam:** todos los
datos son ficticios (tarjeta de prueba 4242 4242 4242 4242) y el modal se incrusta como iframe
transparente sobre una página de tienda simulada, sin ninguna tienda o pago real.

## Requisitos

- Node.js 18+
- Redis corriendo: `redis-server` (o `docker run -p 6379:6379 redis`)

## Configuración

1. `npm install`
2. Generar el par de claves RSA 2048: `node scripts/gen-keys.mjs`
   - Pegar la salida en `.env.local`:
     - `PAYLOAD_PUBLIC_KEY=<PEM pública>` (se entrega a página B / se sirve en `/info`)
     - `PAYLOAD_PRIVATE_KEY=<base64 de la privada>` (solo servidor)
   - `PUBLIC_BASE_URL=<https://...>` URL pública del despliegue (para auto-registrar webhooks)
   - `TELEGRAM_BOT_TOKEN` y `TELEGRAM_GROUP_ID` (solo para el demo del `/generator`)
   - `REDIS_URL` (opcional)
3. `npm run dev` → abrir `http://localhost:3000`

## Uso como iframe

1. `npm run dev`
2. Túnel HTTPS para el webhook:
   - `ngrok http 3000`
   - o `cloudflared tunnel --url http://localhost:3000`
3. Registrar el webhook con la URL del túnel (solo si no se usa auto-registro):
   - `npm run set-webhook -- https://abc123.ngrok.io`
4. Abrir `http://localhost:3000/generator`, completar los datos (precargados con el mock 4242...) y
   las URLs de redirección, y pulsar "Generar URL del iframe". Copiar el snippet `<iframe>`.
5. Pegar el snippet en la página de la tienda. El iframe es transparente y a pantalla completa:
   la tienda se ve de fondo oscurecida al 50% y el modal aparece centrado encima.
6. Operar el bot desde la app de Telegram (p. ej. "Pedir OTP" → el modal pide el código → "✅ Check"
   → el modal redirige a la URL de éxito). "Use Another Card" redirige a la URL de declinado.
7. Al terminar: `npm run set-webhook -- --clear`

## Cifrado asimétrico (envelope RSA + AES)

El payload completo (tarjeta, precio, redirects y las credenciales `telegram` de cada página) viaja
cifrado en la URL (`?d=<token>`) y se descifra **solo server-side**.

- **Página B** cifra con la clave pública:
  1. `GET /api/crypto/public-key` → PEM SPKI (única para todos).
  2. Cifra el payload con **AES-256-GCM** (clave AES aleatoria).
  3. Cifra la clave AES con **RSA-OAEP-SHA256**.
  4. Token: `base64url( iv(12) ‖ tag(16) ‖ len(2) ‖ aesKeyCifrada ‖ ciphertext )` → `?d=<token>`.
- **Este servidor** descifra con la clave privada, guarda `sessionId → {botToken, chatId}` en Redis
  (TTL 30 min) y nunca expone las credenciales al navegador.
- **Webhook por página**: cada bot usa su propio `setWebhook` (auto-registrado la primera vez,
  con verificación real vía `getWebhookInfo` y cache en Redis). El handler resuelve el bot por el
  `Session ID` del mensaje.
- **Responsabilidad del cierre**: el bot pertenece al cliente (página B), así que **ellos** cierran
  su webhook cuando terminan (`deleteWebhook` con su token). Un webhook sin uso apuntando aquí es
  inofensivo; las sesiones expiran solas (30 min).

Guía completa para el desarrollador de página B (pasos, payload, ejemplos Node.js y Web Crypto y la
clave pública): **`/info`**.

## Notas de seguridad

- La clave privada y `REDIS_URL` viven solo en `.env.local` (gitignored). Si un token se comparte en
  un chat, rotarlo.
- El token del bot y el chat id **no** viajan en claro en la URL ni en el bundle JS.
- Los datos enviados al bot son siempre el mock quemado (4242...); ningún participante ingresa datos
  reales de tarjeta.
- `/api/bin/validate` requiere `API_BIN_TOKEN` y no se usa en el demo.

## Tests

`npm test` (Vitest: Luhn, `cn()`, `CheckCardService`, `rsaCipher`).