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