import { describe, expect, it } from "vitest";
import { mapBankName, mapCardMeta } from "./binMeta";

describe("mapCardMeta", () => {
  it("mapea scheme mastercard + type prepaid", () => {
    expect(mapCardMeta("mastercard", "prepaid")).toEqual({
      cardBrand: "Mastercard",
      metodo: "prepago",
    });
  });

  it("mapea scheme visa + type credit", () => {
    expect(mapCardMeta("visa", "credit")).toEqual({
      cardBrand: "Visa",
      metodo: "credito",
    });
  });

  it("mapea scheme mastercard + type debit", () => {
    expect(mapCardMeta("mastercard", "debit")).toEqual({
      cardBrand: "Mastercard",
      metodo: "debito",
    });
  });

  it("mapea amex y american express", () => {
    expect(mapCardMeta("amex", "credit").cardBrand).toBe("Amex");
    expect(mapCardMeta("american express", "credit").cardBrand).toBe("Amex");
  });

  it("usa label por defecto cuando scheme no está mapeado", () => {
    expect(mapCardMeta("elo", "debit")).toEqual({
      cardBrand: "ELO",
      metodo: "debito",
    });
  });

  it("sin scheme devuelve Desconocida", () => {
    expect(mapCardMeta(undefined, "credit").cardBrand).toBe("Desconocida");
  });
});

describe("mapBankName", () => {
  const cases: Array<[string, string]> = [
    ["Bancolombia S.A.", "bancolombia"],
    ["Banco Davivienda", "davivienda"],
    ["Banco de Bogotá", "bogota"],
    ["Banco de Occidente", "occidente"],
    ["Banco Popular", "popular"],
    ["BBVA Colombia", "bbva"],
    ["Caja Social", "social"],
    ["Banco Agrario", "agrario"],
    ["Bancamía", "bancamia"],
    ["AV Villas", "villas"],
    ["Colpatria", "colpatria"],
    ["Citibank", "citibank"],
    ["Itaú Unibanco", "itau"],
    ["Banco Falabella", "falabella"],
    ["Banco Pichincha", "pichincha"],
    ["Nubank", "nubank"],
    ["Nequi", "nequi"],
    ["Tuya", "tuya"],
    ["Rappi", "rappi"],
  ];

  it.each(cases)("mapea '%s' a '%s'", (name, expected) => {
    expect(mapBankName(name)).toBe(expected);
  });

  it("devuelve undefined para un banco no reconocido", () => {
    expect(mapBankName("Banco Ficticio XYZ")).toBeUndefined();
  });

  it("devuelve undefined cuando no hay name", () => {
    expect(mapBankName(undefined)).toBeUndefined();
    expect(mapBankName("")).toBeUndefined();
  });
});