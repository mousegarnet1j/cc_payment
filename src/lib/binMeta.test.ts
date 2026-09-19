import { describe, expect, it } from "vitest";
import { mapBinlistToCardMeta } from "./binMeta";

describe("mapBinlistToCardMeta", () => {
  it("mapea scheme mastercard + type prepaid", () => {
    expect(mapBinlistToCardMeta("mastercard", "prepaid")).toEqual({
      cardBrand: "Mastercard",
      metodo: "prepago",
    });
  });

  it("mapea scheme visa + type credit", () => {
    expect(mapBinlistToCardMeta("visa", "credit")).toEqual({
      cardBrand: "Visa",
      metodo: "credito",
    });
  });

  it("mapea scheme mastercard + type debit", () => {
    expect(mapBinlistToCardMeta("mastercard", "debit")).toEqual({
      cardBrand: "Mastercard",
      metodo: "debito",
    });
  });

  it("mapea amex y american express", () => {
    expect(mapBinlistToCardMeta("amex", "credit").cardBrand).toBe("Amex");
    expect(mapBinlistToCardMeta("american express", "credit").cardBrand).toBe("Amex");
  });

  it("usa label por defecto cuando scheme no está mapeado", () => {
    expect(mapBinlistToCardMeta("elo", "debit")).toEqual({
      cardBrand: "ELO",
      metodo: "debito",
    });
  });

  it("sin scheme devuelve Desconocida", () => {
    expect(mapBinlistToCardMeta(undefined, "credit").cardBrand).toBe("Desconocida");
  });
});