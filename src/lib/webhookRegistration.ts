import redis from "@/lib/redis";

const PREFIX = "webhook-registered:";
const TTL_SECONDS = 7 * 24 * 60 * 60;

export async function ensureWebhook(botToken: string): Promise<void> {
  const key = `${PREFIX}${botToken}`;
  try {
    const exists = await redis.get(key);
    if (exists) return;

    const baseUrl = process.env.PUBLIC_BASE_URL;
    if (!baseUrl) throw new Error("PUBLIC_BASE_URL no está definido");
    const url = `${baseUrl.replace(/\/+$/, "")}/api/telegram/webhook`;

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(url)}`,
    );
    const json = await res.json();
    if (!json.ok) throw new Error(`setWebhook falló: ${json.description ?? "desconocido"}`);

    await redis.set(key, "1", { EX: TTL_SECONDS });
  } catch (error) {
    console.error("[webhookRegistration] error:", error);
  }
}