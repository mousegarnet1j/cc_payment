import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("une clases simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("mergea clases de Tailwind conflictivas (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, null, "")).toBe("a");
  });
});