import {
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  constants,
} from "crypto";

const AES_ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN_BYTES = 2;
const OAEP = constants.RSA_PKCS1_OAEP_PADDING;
const OAEP_HASH = "sha256";

export function getPrivateKeyPem(): string {
  const b64 = process.env.PAYLOAD_PRIVATE_KEY ?? "";
  if (!b64) throw new Error("PAYLOAD_PRIVATE_KEY no está definido");
  return Buffer.from(b64, "base64").toString("utf8");
}

export function getPublicKeyPem(): string {
  const raw = process.env.PAYLOAD_PUBLIC_KEY ?? "";
  if (!raw) throw new Error("PAYLOAD_PUBLIC_KEY no está definido");
  if (raw.includes("-----BEGIN")) return raw;
  return Buffer.from(raw, "base64").toString("utf8");
}

export function encryptEnvelope(payload: unknown, publicKeyPem: string): string {
  const aesKey = randomBytes(32);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(AES_ALGO, aesKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const encKey = publicEncrypt(
    { key: publicKeyPem, padding: OAEP, oaepHash: OAEP_HASH },
    aesKey,
  );
  const len = Buffer.alloc(KEY_LEN_BYTES);
  len.writeUInt16BE(encKey.length);
  return Buffer.concat([iv, cipher.getAuthTag(), len, encKey, ciphertext]).toString("base64url");
}

export function decryptEnvelope<T>(token: string, privateKeyPem: string): T {
  const buf = Buffer.from(token, "base64url");
  const min = IV_LEN + TAG_LEN + KEY_LEN_BYTES;
  if (buf.length <= min) throw new Error("Token inválido");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encKeyLen = buf.readUInt16BE(IV_LEN + TAG_LEN);
  const encKey = buf.subarray(
    IV_LEN + TAG_LEN + KEY_LEN_BYTES,
    IV_LEN + TAG_LEN + KEY_LEN_BYTES + encKeyLen,
  );
  if (encKey.length !== encKeyLen) throw new Error("Token inválido");
  const aesKey = privateDecrypt({ key: privateKeyPem, padding: OAEP, oaepHash: OAEP_HASH }, encKey);
  const decipher = createDecipheriv(AES_ALGO, aesKey, iv);
  decipher.setAuthTag(tag);
  const text = Buffer.concat([
    decipher.update(buf.subarray(IV_LEN + TAG_LEN + KEY_LEN_BYTES + encKeyLen)),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(text) as T;
}