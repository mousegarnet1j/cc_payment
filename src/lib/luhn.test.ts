import { describe, expect, it } from "vitest";
import { isLuhnValid } from "./luhn";

describe("isLuhnValid", () => {
  it("valida la tarjeta de prueba 4242 4242 4242 4242", () => {
    expect(isLuhnValid("4859537428532001")).toBe(true);
  });

  it("rechaza un número inválido", () => {
    expect(isLuhnValid("4242424242424241")).toBe(false);
  });

  it("ignora espacios y guiones", () => {
    expect(isLuhnValid("4242 4242 4242 4242")).toBe(true);
  });

  it("rechaza cadenas vacías o demasiado cortas", () => {
    expect(isLuhnValid("")).toBe(false);
    expect(isLuhnValid("1")).toBe(false);
  });
});