# Demo educativa de phishing — Modal de pago falso: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un demo educativo Next.js (Pages Router) que reproduce fielmente un modal de pago falso y su integración con un bot de Telegram, con datos 100% ficticios (tarjeta 4242…), banner de "entorno simulado" permanente y webhook real solo durante la presentación vía túnel.

**Architecture:** Fidelidad total al material original: los handlers server (`telegram.zip`, `bin.zip`) caen verbatim en `src/pages/api/`, los wrappers client (`telegram_2.zip`, `bin_2.zip`) caen verbatim en `src/services/`, y el modal en `src/components/`. Solo se crea código nuevo para las piezas ausentes: `lib/redis` (ioredis), `lib/luhn` (función pura), `services/checkCardService`, `utils/cn`, la página demo y el script `set-webhook`. El flujo: modal publica datos mock en el grupo de Telegram → presentador pulsa botón en el bot → webhook actualiza estado en Redis → modal pollea `checkStatus` y transiciona.

**Tech Stack:** Next.js 15 (Pages Router, `src-dir`, alias `@/*`) · TypeScript · Tailwind v4 · ESLint · `clsx` + `tailwind-merge` · `ioredis` (Redis local) · Vitest (dev).

---

### Task 1: Scaffold Next.js (Pages Router) en el directorio del proyecto

**Files:**
- Create: raíz del proyecto (package.json, tsconfig.json, src/, public/, etc. generados por create-next-app)
- Modify: `.gitignore` (append `*.zip`)

- [ ] **Step 1: Scaffold en carpeta temporal**

```bash
SCAFFOLD=/var/folders/8s/x25mchjd6f1675gz_4p187br0000gn/T/opencode/cc_payment_scaffold
rm -rf "$SCAFFOLD" && mkdir -p "$SCAFFOLD"
cd "$SCAFFOLD"
npx --yes create-next-app@latest . --typescript --tailwind --eslint --src-dir --no-app --import-alias "@/*" --use-npm --yes
```
Expected: proyecto Pages Router creado con `src/pages/`, `src/styles/globals.css` (Tailwind), alias `@/*` → `src/*`, deps instaladas.

Nota: si `--no-app` no fuera reconocido por la versión de create-next-app, ejecutar `npx create-next-app@latest --help` y usar el flag equivalente (`--no-app` o responder `no` a "Would you like to use App Router?").

- [ ] **Step 2: Mover el scaffold al proyecto (sin .git ni node_modules)**

```bash
rsync -a --exclude='.git/' --exclude='node_modules/' "$SCAFFOLD/" /Users/elianchox/dev/job/sparrow/cc_payment/
```
Expected: `package.json`, `tsconfig.json`, `src/`, `public/`, `.gitignore` (el de create-next-app, que ya ignora `.env*`) copiados al proyecto; se conservan `docs/`, `.git/` y los `.zip`.

- [ ] **Step 3: Configurar identidad git local y .gitignore**

```bash
cd /Users/elianchox/dev/job/sparrow/cc_payment
git config user.name "dev"
git config user.email "dev@local"
printf '*.zip\n' >> .gitignore
```
Expected: commits posteriores funcionan sin `-c`; los `.zip` no se trackean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 Pages Router con Tailwind, src-dir y alias @/*"
```

---

### Task 2: Dependencias y setup de Vitest

**Files:**
- Modify: `package.json` (scripts `test`, `set-webhook` — `set-webhook` se agrega en Task 10)
- Create: `vitest.config.ts`

- [ ] **Step 1: Instalar dependencias**

```bash
cd /Users/elianchox/dev/job/sparrow/cc_payment
npm install
npm install clsx tailwind-merge ioredis
npm install -D vitest
```
Expected: deps instaladas; `clsx`, `tailwind-merge`, `ioredis` en dependencies; `vitest` en devDependencies.

- [ ] **Step 2: Agregar script de test**

Editar `package.json` → sección `"scripts"` → agregar:
```json
"test": "vitest run"
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: dependencias clsx, tailwind-merge, ioredis y setup Vitest"
```

---

### Task 3: Integrar material original verbatim

**Files:**
- Create (copias verbatim): los archivos de los ZIP en sus rutas exactas (tabla abajo)
- Create (copias para resolver referencias): `public/loading.gif`, `public/banks/pichincha.png`
- Delete: `src/pages/api/hello.ts` (generado por el scaffold)

- [ ] **Step 1: Extraer los ZIP a carpetas separadas (server vs client)**

```bash
TMP=/var/folders/8s/x25mchjd6f1675gz_4p187br0000gn/T/opencode/cc_payment_src
rm -rf "$TMP" && mkdir -p "$TMP/server" "$TMP/client"
cd /Users/elianchox/dev/job/sparrow/cc_payment
unzip -o PaymentStatusModal.zip -d "$TMP"
unzip -o telegram.zip -d "$TMP/server"        # handlers server
unzip -o bin.zip -d "$TMP/server"             # handlers server
unzip -o telegram_2.zip -d "$TMP/client"      # wrappers client
unzip -o bin_2.zip -d "$TMP/client"           # wrappers client
unzip -o styles.zip -d "$TMP"
unzip -o types.zip -d "$TMP"
unzip -o utils.zip -d "$TMP"
unzip -o banks.zip -d "$TMP"
```
Nota: separar server/client evita que `unzip -o` sobrescriba homónimos. Clasificación: `telegram.zip`/`bin.zip` = handlers server (importan `NextApiRequest`); `telegram_2.zip`/`bin_2.zip` = wrappers client (hacen `fetch`).

- [ ] **Step 2: Copiar handlers server (verbatim) a `src/pages/api/`**

```bash
mkdir -p src/pages/api/telegram src/pages/api/bin
cp "$TMP/server/telegram/webhook.ts"          src/pages/api/telegram/webhook.ts
cp "$TMP/server/telegram/hook.ts"             src/pages/api/telegram/hook.ts
cp "$TMP/server/telegram/checkStatus.ts"      src/pages/api/telegram/checkStatus.ts
cp "$TMP/server/telegram/sendMessage.ts"      src/pages/api/telegram/sendMessage.ts
cp "$TMP/server/telegram/savePaymentState.ts" src/pages/api/telegram/savePaymentState.ts
cp "$TMP/server/telegram/sendMessageLogs.ts"  src/pages/api/telegram/sendMessageLogs.ts
cp "$TMP/server/bin/lookup.ts"                src/pages/api/bin/lookup.ts
cp "$TMP/server/bin/luhn.ts"                  src/pages/api/bin/luhn.ts
cp "$TMP/server/bin/validate.ts"              src/pages/api/bin/validate.ts
rm -f src/pages/api/hello.ts
```

- [ ] **Step 3: Copiar wrappers client (verbatim) a `src/services/`**

```bash
mkdir -p src/services/telegram src/services/bin
cp "$TMP/client/telegram/sendMessage.ts"      src/services/telegram/sendMessage.ts
cp "$TMP/client/telegram/savePaymentState.ts" src/services/telegram/savePaymentState.ts
cp "$TMP/client/telegram/sendMessageLogs.ts"  src/services/telegram/sendMessageLogs.ts
cp "$TMP/client/bin/luhn.ts"                  src/services/bin/luhn.ts
cp "$TMP/client/bin/validate.ts"              src/services/bin/validate.ts
```

- [ ] **Step 4: Copiar modal, utils, types, estilos y bancos**

```bash
mkdir -p src/components src/utils src/types src/styles public/banks
cp "$TMP/PaymentStatusModal.tsx"      src/components/PaymentStatusModal.tsx
cp "$TMP/utils/paymentStorage.ts"     src/utils/paymentStorage.ts
cp "$TMP/utils/auth.ts"               src/utils/auth.ts
cp "$TMP/utils/formatNumber.ts"       src/utils/formatNumber.ts
cp "$TMP/types/bin.t.ts"              src/types/bin.t.ts
cp "$TMP/types/white.t.ts"            src/types/white.t.ts
cp "$TMP/styles/paymentStatusModal.css" src/styles/paymentStatusModal.css
cp -R "$TMP/banks/."                  public/banks/
```
Nota: `paymentStorage.ts` importa `redis` de `@/lib/redis` — ese archivo se crea en Task 4.

- [ ] **Step 5: Copiar assets que el modal referencia por otras rutas**

```bash
cp "$TMP/banks/loading.gif"   public/loading.gif
cp "$TMP/banks/pichincha.jpg" public/banks/pichincha.png
```
Nota: el modal usa `<Image src="/loading.gif">` y `<Image src="/banks/pichincha.png">`. El ZIP trae `banks/loading.gif` y `pichincha.jpg`; estas copias hacen que las rutas referenciadas resuelvan sin tocar el modal (pichincha.png contiene bytes jpg, el navegador los renderiza igual).

- [ ] **Step 6: Typecheck temprano (contingencia)**

```bash
npx tsc --noEmit
```
Expected: sin errores. Si errores de tipos aparecen **solo** en archivos verbatim legacy, aplicar la contingencia menos invasiva en `tsconfig.json` (archivo nuestro): cambiar `"strict": true` → `"strict": false`, sin tocar los archivos originales. Documentar el cambio.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrar material original verbatim (handlers, wrappers, modal, assets)"
```

---

### Task 4: Cliente Redis (`src/lib/redis.ts`)

**Files:**
- Create: `src/lib/redis.ts`

- [ ] **Step 1: Instalar node-redis (reemplaza ioredis)**

```bash
npm uninstall ioredis
npm install redis
```
Nota: `paymentStorage.ts` verbatim usa `redis.set(key, val, { EX })` (forma objeto). `ioredis@6` no la soporta; **node-redis v4** (paquete `redis`) sí — es el cliente para el que el código original fue escrito. No se modifica `paymentStorage.ts`.

- [ ] **Step 2: Crear el cliente node-redis**

`src/lib/redis.ts`:
```ts
import { createClient } from "redis";

const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const globalForRedis = globalThis as unknown as { __redis?: ReturnType<typeof createClient> };

export const redis = globalForRedis.__redis ?? createClient({ url });

if (process.env.NODE_ENV !== "production") globalForRedis.__redis = redis;

redis.connect().catch((err) => console.error("[redis] connection error:", err));

export default redis;
```
Expected: default export compatible con `import redis from "@/lib/redis"` de `src/utils/paymentStorage.ts` (`set(key, val, { EX })`, `get`, `del`). node-redis encola comandos hasta que la conexión esté lista.

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit
```
Expected: el error `EX` de `paymentStorage.ts:26` desaparece. Solo puede quedar el error de `../services/checkCardService` (Task 7). NO arreglarlo.

- [ ] **Step 4: Commit**

```bash
git add src/lib/redis.ts package.json package-lock.json
git commit -m "feat: cliente redis (node-redis) para el estado de sesión"
```

---

### Task 5: Función pura Luhn (`src/lib/luhn.ts`) — TDD

**Files:**
- Create: `src/lib/luhn.ts`
- Test: `src/lib/luhn.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/lib/luhn.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isLuhnValid } from "./luhn";

describe("isLuhnValid", () => {
  it("valida la tarjeta de prueba 4242 4242 4242 4242", () => {
    expect(isLuhnValid("4859537428532001")).toBe(true);
  });

  it("rechaza un número inválido", () => {
    expect(isLuhnValid("4242424242424241")).toBe(false);
  });

  it("ignora espacios y guiones", () => {
    expect(isLuhnValid("4242 4242 4242 4242")).toBe(true);
  });

  it("rechaza cadenas vacías o demasiado cortas", () => {
    expect(isLuhnValid("")).toBe(false);
    expect(isLuhnValid("1")).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

```bash
npx vitest run src/lib/luhn.test.ts
```
Expected: FAIL (module no existe / `isLuhnValid is not a function`).

- [ ] **Step 3: Implementación mínima**

`src/lib/luhn.ts`:
```ts
export function isLuhnValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}
```

- [ ] **Step 4: Ejecutar el test para verlo pasar**

```bash
npx vitest run src/lib/luhn.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/luhn.ts src/lib/luhn.test.ts
git commit -m "feat: validación Luhn (TDD)"
```

---

### Task 6: Utilidad `cn()` (`src/utils/cn.ts`) — TDD

**Files:**
- Create: `src/utils/cn.ts`
- Test: `src/utils/cn.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/utils/cn.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("une clases simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("mergea clases de Tailwind conflictivas (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, null, "")).toBe("a");
  });
});
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

```bash
npx vitest run src/utils/cn.test.ts
```
Expected: FAIL (module no existe).

- [ ] **Step 3: Implementación mínima**

`src/utils/cn.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Ejecutar el test para verlo pasar**

```bash
npx vitest run src/utils/cn.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/cn.ts src/utils/cn.test.ts
git commit -m "feat: utilidad cn (clsx + tailwind-merge) con TDD"
```

---

### Task 7: `CheckCardService` (`src/services/checkCardService.ts`) — TDD

**Files:**
- Create: `src/services/checkCardService.ts`
- Test: `src/services/checkCardService.test.ts`

Contrato que usa el modal (`PaymentStatusModal.tsx` línea 395): `CheckCardService.validateCard(card)` → `{ success, issuer, level, brand, type, country, infocc }`.

- [ ] **Step 1: Escribir el test que falla**

`src/services/checkCardService.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { CheckCardService } from "./checkCardService";

describe("CheckCardService.validateCard", () => {
  it("devuelve datos Visa para la tarjeta de prueba 4242", () => {
    const r = CheckCardService.validateCard("4859537428532001");
    expect(r.success).toBe(true);
    expect(r.issuer).toBe("Visa");
    expect(r.brand).toBe("Visa");
    expect(r.type).toBe("credit");
  });

  it("devuelve success:false para una tarjeta que no pasa Luhn", () => {
    const r = CheckCardService.validateCard("1234567890123456");
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

```bash
npx vitest run src/services/checkCardService.test.ts
```
Expected: FAIL (module no existe).

- [ ] **Step 3: Implementación mínima**

`src/services/checkCardService.ts`:
```ts
import { isLuhnValid } from "@/lib/luhn";

export interface CardInfoResult {
  success: boolean;
  issuer?: string;
  level?: string;
  brand?: string;
  type?: string;
  country?: string;
  infocc?: string;
}

const TEST_BIN = "4242";

export const CheckCardService = {
  validateCard(card: string): CardInfoResult {
    const clean = card.replace(/\D/g, "");

    if (!isLuhnValid(clean)) {
      return { success: false };
    }

    if (clean.startsWith(TEST_BIN)) {
      return {
        success: true,
        issuer: "Visa",
        level: "Classic",
        brand: "Visa",
        type: "credit",
        country: "CO",
        infocc: "Visa Clásica",
      };
    }

    return {
      success: true,
      issuer: "Desconocido",
      level: "N/A",
      brand: "N/A",
      type: "N/A",
      country: "N/A",
      infocc: "N/A",
    };
  },
};
```
Nota: `issuer` no debe ser `"Desconocido"` para la tarjeta de prueba, porque el modal solo envía el mensaje a Telegram cuando `cardInfo.issuer !== "Desconocido"` (línea 425).

- [ ] **Step 4: Ejecutar el test para verlo pasar**

```bash
npx vitest run src/services/checkCardService.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/checkCardService.ts src/services/checkCardService.test.ts
git commit -m "feat: CheckCardService con validación Luhn y datos mock (TDD)"
```

---

### Task 8: Variables de entorno (`.env.local` + `.env.example`)

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore` (permitir commit de `.env.example`)

- [ ] **Step 1: Crear `.env.local`**

`.env.local`:
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_GROUP_ID=-5459536235
REDIS_URL=redis://127.0.0.1:6379
```
Nota: `TELEGRAM_GROUP_ID` es el chat id del grupo (`-5459536235`) que usan los handlers verbatim (`process.env.TELEGRAM_GROUP_ID`). `TELEGRAM_BOT_TOKEN` se deja vacío: el presentador debe pegar ahí el **token rotado** (el compartido en chat está comprometido). Este archivo está gitignored por el `.gitignore` de create-next-app (`.env*`).

- [ ] **Step 2: Crear `.env.example` y ajustar `.gitignore`**

`.env.example`:
```
# Bot principal (obligatorio)
TELEGRAM_BOT_TOKEN=
TELEGRAM_GROUP_ID=

# Redis (opcional; por defecto redis://127.0.0.1:6379)
REDIS_URL=

# Solo si se invoca /api/telegram/sendMessageLogs (no usado por el demo)
TELEGRAM_BOT_TOKEN_LOGS=
TELEGRAM_GROUP_ID_LOGS=

# Solo si se invoca /api/bin/validate (no usado por el demo)
API_BIN_TOKEN=
```

Append a `.gitignore`:
```
!.env.example
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs: plantilla de variables de entorno y grupo de Telegram"
```
Nota: `.env.local` no se agrega (gitignored).

---

### Task 9: Página principal del demo (`src/pages/index.tsx`)

**Files:**
- Modify: `src/pages/index.tsx` (reemplaza la generada)

- [ ] **Step 1: Escribir la página demo**

`src/pages/index.tsx`:
```tsx
import { useState } from "react";
import PaymentStatusModal from "@/components/PaymentStatusModal";

const MOCK_PAYMENT = {
  numeroTarjeta: "4859537428532001",
  vencimiento: "12/28",
  cvv: "123",
  titular: "MARIA DEMO",
  email: "maria.demo@ejemplo.com",
  celular: "3001234567",
  telefono: "3001234567",
  cardBrand: "Visa",
  metodo: "credito",
};

const PRICE = "199900";
const PRICE_FORMATTED = "$199.900";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const openDemo = () => {
    const id = `demo-${Date.now()}`;
    localStorage.setItem("checkout_payment", JSON.stringify(MOCK_PAYMENT));
    setSessionId(id);
    setIsOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 w-full bg-red-600 px-4 py-3 text-center text-sm font-bold text-white">
        ⚠ ENTORNO SIMULADO — No ingrese datos reales. Demo educativa de ciberseguridad.
      </div>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Así funciona un ataque de pago falso
        </h1>
        <p className="text-slate-600">
          Este demo muestra cómo un atacante engaña a una persona haciéndole creer que está
          pagando, mientras en realidad captura sus datos por Telegram. Todos los datos son
          ficticios (tarjeta de prueba 4242 4242 4242 4242).
        </p>

        <button
          onClick={openDemo}
          className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Abrir simulación
        </button>

        <ol className="text-left text-sm text-slate-600">
          <li>1. Pulsa "Abrir simulación" para abrir el modal de pago.</li>
          <li>2. Abre Telegram: verás el mensaje con los datos de prueba del cliente.</li>
          <li>3. Pulsa "Pedir OTP" en el bot para que el modal pida el código.</li>
          <li>4. Escribe un OTP de prueba (p. ej. 123456) y pulsa "✅ Check".</li>
        </ol>
      </section>

      <PaymentStatusModal
        sessionId={sessionId}
        isOpen={isOpen}
        price={PRICE}
        priceFormatted={PRICE_FORMATTED}
        last4="4242"
        card="4242 4242 4242 4242"
        cardT="Crédito"
        vencimiento="12/28"
        cvv="123"
        titular="MARIA DEMO"
        cardBrand="Visa"
        email="maria.demo@ejemplo.com"
        contactData={{ email: "maria.demo@ejemplo.com", celular: "3001234567" }}
        onClose={() => setIsOpen(false)}
      />
    </main>
  );
}
```
Expected: página con banner permanente, botón que precarga el mock en `localStorage` (`checkout_payment`) y abre el modal con props de prueba.

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat: página demo con banner, botón y mock precargado"
```

---

### Task 10: Script de registro del webhook (`scripts/set-webhook.mjs`)

**Files:**
- Create: `scripts/set-webhook.mjs`
- Modify: `package.json` (script `set-webhook`)

- [ ] **Step 1: Crear el script**

`scripts/set-webhook.mjs`:
```js
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = {};
  try {
    const content = readFileSync(resolve(".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // sin .env.local
  }
  return env;
}

const token = process.env.TELEGRAM_BOT_TOKEN || loadEnv().TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Falta TELEGRAM_BOT_TOKEN en .env.local");
  process.exit(1);
}

const clear = process.argv.includes("--clear");
const urlArg = process.argv.find((a) => a.startsWith("http"));

const api = `https://api.telegram.org/bot${token}`;

if (clear) {
  const res = await fetch(`${api}/deleteWebhook`);
  const json = await res.json();
  console.log("deleteWebhook:", json);
  process.exit(0);
}

if (!urlArg) {
  console.error("Pasa la URL del túnel, p. ej.: npm run set-webhook -- https://abc123.ngrok.io");
  process.exit(1);
}

const url = `${urlArg.replace(/\/+$/, "")}/api/telegram/webhook`;
const res = await fetch(`${api}/setWebhook?url=${encodeURIComponent(url)}`);
const json = await res.json();
console.log("setWebhook:", json);
```

- [ ] **Step 2: Agregar el npm script**

Editar `package.json` → `"scripts"` → agregar:
```json
"set-webhook": "node scripts/set-webhook.mjs"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/set-webhook.mjs package.json
git commit -m "feat: script para registrar/limpiar el webhook del bot"
```

---

### Task 11: README

**Files:**
- Modify: `README.md` (reemplaza la generada por create-next-app)

- [ ] **Step 1: Escribir el README**

`README.md`:
```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README con instrucciones de setup, demo y webhook"
```

---

### Task 12: Verificación completa

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Verificar Redis y entorno**

```bash
redis-cli ping
```
Expected: `PONG`. Si no, levantar `redis-server` o `docker run -p 6379:6379 redis`.

- [ ] **Step 2: Tests, lint y build**

```bash
npm test
npm run lint
npm run build
```
Expected: tests PASS; lint sin errores; build OK.

Nota: si `lint` o `build` fallan **solo** por archivos verbatim legacy (TS strict), aplicar la contingencia de Task 3 Step 6 (`"strict": false` en tsconfig.json) y re-correr.

- [ ] **Step 3: Prueba manual del bucle completo**

1. `.env.local` con `TELEGRAM_BOT_TOKEN` (token rotado) y `TELEGRAM_GROUP_ID`.
2. `npm run dev`.
3. Túnel activo + `npm run set-webhook -- <url>`.
4. Abrir `http://localhost:3000` → pulsar "Abrir simulación".
5. Verificar en el grupo de Telegram que llega el mensaje "👤 Nuevo pago de cliente" con Session ID y la tarjeta 4242… (mock), con botones.
6. Pulsar "Pedir OTP" en el bot → verificar en ~2 s que el modal muestra el input OTP.
7. Escribir `123456` → verificar que llega a Telegram.
8. Pulsar "✅ Check" → verificar que el modal muestra "PAGO APROBADO".
9. `npm run set-webhook -- --clear`.

- [ ] **Step 4: Verificar ausencia de secrets en git**

```bash
git grep -n -E "AAH[A-Za-z0-9_-]{20,}" -- ':!docs' || echo "OK: sin tokens en git"
git check-ignore .env.local
```
Expected: sin coincidencias; `.env.local` está ignorado.