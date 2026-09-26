import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import redis from "@/lib/redis";
import { closeWebhook, ensureWebhook } from "./webhookRegistration";

const TOKEN = "123456:ABC-def";
const EXPECTED_URL = "https://example.com/api/telegram/webhook";

const mockRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

const mockFetch = vi.fn();

beforeEach(() => {
  process.env.PUBLIC_BASE_URL = "https://example.com";
  mockRedis.get.mockReset();
  mockRedis.set.mockReset();
  mockRedis.del.mockReset();
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const telegramResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("ensureWebhook", () => {
  it("re-registra aunque la cache diga que ya está registrado", async () => {
    mockRedis.get.mockResolvedValue(EXPECTED_URL);
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: { url: "" } }),
    );
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: true }),
    );

    const result = await ensureWebhook(TOKEN);

    expect(result?.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${TOKEN}/getWebhookInfo`,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(EXPECTED_URL)}`,
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      `webhook-registered:${TOKEN}`,
      EXPECTED_URL,
      expect.objectContaining({ EX: expect.any(Number) }),
    );
  });

  it("no llama a setWebhook si getWebhookInfo ya apunta a la URL esperada", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: { url: EXPECTED_URL } }),
    );

    const result = await ensureWebhook(TOKEN);

    expect(result?.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
  });

  it("registra el webhook cuando no está configurado y escribe la cache", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: { url: "" } }),
    );
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: true }),
    );

    const result = await ensureWebhook(TOKEN);

    expect(result?.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockRedis.set).toHaveBeenCalledWith(
      `webhook-registered:${TOKEN}`,
      EXPECTED_URL,
      expect.objectContaining({ EX: expect.any(Number) }),
    );
  });

  it("devuelve error si falta PUBLIC_BASE_URL", async () => {
    delete process.env.PUBLIC_BASE_URL;

    const result = await ensureWebhook(TOKEN);

    expect(result?.ok).toBe(false);
    expect(result?.error).toMatch(/PUBLIC_BASE_URL/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("devuelve error si getWebhookInfo falla", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: false, description: "Unauthorized" }),
    );

    const result = await ensureWebhook(TOKEN);

    expect(result?.ok).toBe(false);
    expect(result?.error).toMatch(/getWebhookInfo/i);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it("devuelve error si setWebhook falla", async () => {
    mockRedis.get.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: { url: "" } }),
    );
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: false, description: "Bad Request" }),
    );

    const result = await ensureWebhook(TOKEN);

    expect(result?.ok).toBe(false);
    expect(result?.error).toMatch(/setWebhook/i);
  });
});

describe("closeWebhook", () => {
  it("borra el webhook en Telegram y limpia la cache", async () => {
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: true, result: true }),
    );

    const result = await closeWebhook(TOKEN);

    expect(result?.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${TOKEN}/deleteWebhook`,
    );
    expect(mockRedis.del).toHaveBeenCalledWith(`webhook-registered:${TOKEN}`);
  });

  it("devuelve error si deleteWebhook falla", async () => {
    mockFetch.mockResolvedValueOnce(
      telegramResponse({ ok: false, description: "Unauthorized" }),
    );

    const result = await closeWebhook(TOKEN);

    expect(result?.ok).toBe(false);
    expect(result?.error).toMatch(/deleteWebhook/i);
  });
});