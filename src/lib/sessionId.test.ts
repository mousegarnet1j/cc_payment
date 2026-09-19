import { describe, expect, it } from "vitest";
import { sessionIdFromToken } from "./sessionCredentials";

describe("sessionIdFromToken", () => {
  it("es determinista para el mismo token", () => {
    const token = "e5NvjCzybtJNTe2wddTpgIh3g3eQCC7B";
    expect(sessionIdFromToken(token)).toBe(sessionIdFromToken(token));
  });

  it("es distinta para tokens distintos", () => {
    expect(sessionIdFromToken("token-a")).not.toBe(sessionIdFromToken("token-b"));
  });

  it("tiene prefijo p- y 16 hex", () => {
    expect(sessionIdFromToken("x")).toMatch(/^p-[0-9a-f]{16}$/);
  });
});