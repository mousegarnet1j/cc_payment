import { describe, expect, it } from "vitest";
import { comercioCorto } from "./comercio";

describe("comercioCorto", () => {
  it("deriva la variante corta cortando en el primer separador", () => {
    expect(comercioCorto("Secretaria de transporte - Movilidad © 2026")).toBe(
      "Secretaria de transporte",
    );
  });

  it("devuelve el nombre completo si no hay separador", () => {
    expect(comercioCorto("Tienda Ejemplo")).toBe("Tienda Ejemplo");
  });

  it("recorta espacios sobrantes alrededor del nombre corto", () => {
    expect(comercioCorto("Comercio A - Sucursal B")).toBe("Comercio A");
  });
});