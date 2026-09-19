import { generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";
import { decryptEnvelope, encryptEnvelope } from "./rsaCipher";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const payload = {
  payment: { numeroTarjeta: "4859537428532001", cvv: "123" },
  price: "199900",
  telegram: { botToken: "123:AAH-abc", chatId: "-100123" },
};

describe("rsaCipher", () => {
  it("roundtrip cifra/descifra", () => {
    const token = encryptEnvelope(payload, publicKey);
    expect(token).not.toContain("4859537428532001");
    expect(decryptEnvelope(token, privateKey)).toEqual(payload);
  });

  it("token alterado falla (GCM autentica)", () => {
    const token = encryptEnvelope(payload, publicKey);
    const tampered = token.slice(0, -4) + "AAAA";
    expect(() => decryptEnvelope(tampered, privateKey)).toThrow();
  });

  it("clave privada incorrecta falla", () => {
    const token = encryptEnvelope(payload, publicKey);
    const { privateKey: wrong } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    expect(() => decryptEnvelope(token, wrong)).toThrow();
  });

  it("token corrupto/no-base64 falla", () => {
    expect(() => decryptEnvelope("no-valid-token!", privateKey)).toThrow();
  });
});