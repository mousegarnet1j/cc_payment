import { describe, expect, it } from "vitest";
import { CheckCardService } from "./checkCardService";

describe("CheckCardService.validateCard", () => {
  it("devuelve datos Visa para la tarjeta de prueba 4859", () => {
    const r = CheckCardService.validateCard("4859537428532001");
    expect(r.success).toBe(true);
    expect(r.issuer).toBe("Visa");
    expect(r.brand).toBe("Visa");
    expect(r.type).toBe("credit");
  });

  it("devuelve Visa para la tarjeta 4242 (clásica)", () => {
    const r = CheckCardService.validateCard("4242424242424242");
    expect(r.success).toBe(true);
    expect(r.issuer).toBe("Visa");
    expect(r.brand).toBe("Visa");
    expect(r.type).toBe("credit");
  });

  it("devuelve Mastercard para un BIN 5", () => {
    const r = CheckCardService.validateCard("5555555555554444");
    expect(r.success).toBe(true);
    expect(r.issuer).toBe("Mastercard");
    expect(r.brand).toBe("Mastercard");
  });

  it("devuelve Mastercard para BIN 2221", () => {
    const r = CheckCardService.validateCard("2221000000000009");
    expect(r.success).toBe(true);
    expect(r.brand).toBe("Mastercard");
  });

  it("devuelve Amex para un BIN 37", () => {
    const r = CheckCardService.validateCard("378282246310005");
    expect(r.success).toBe(true);
    expect(r.brand).toBe("Amex");
  });

  it("devuelve brand N/A para un BIN no reconocido (Discover válida)", () => {
    const r = CheckCardService.validateCard("6011000000000004");
    expect(r.success).toBe(true);
    expect(r.brand).toBe("N/A");
  });

  it("devuelve success:false para una tarjeta que no pasa Luhn", () => {
    const r = CheckCardService.validateCard("1234567890123456");
    expect(r.success).toBe(false);
  });
});