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