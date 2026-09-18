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