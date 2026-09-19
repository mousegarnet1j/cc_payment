import redis from "@/lib/redis";

const PREFIX = "webhook-registered:";
const TTL_SECONDS = 7 * 24 * 60 * 60;

async function expectedWebhookUrl(): Promise<string> {
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) throw new Error("PUBLIC_BASE_URL no está definido");
  return `${baseUrl.replace(/\/+$/, "")}/api/telegram/webhook`;
}

export async function ensureWebhook(botToken: string): Promise<void> {
  const key = `${PREFIX}${botToken}`;
  try {
    const url = await expectedWebhookUrl();

    // Cache local: si ya confirmamos esta URL, no volvemos a llamar a Telegram.
    const cached = await redis.get(key);
    if (cached === url) return;

    // Verificación real: getWebhookInfo dice si el bot ya apunta aquí.
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const info = await infoRes.json();
    if (!info.ok) throw new Error(`getWebhookInfo falló: ${info.description ?? "desconocido"}`);

    if (info.result?.url === url) {
      await redis.set(key, url, { EX: TTL_SECONDS });
      return;
    }

    // No está registrado, o apunta a otra URL → lo creamos (o lo re-apuntamos).
    const setRes = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(url)}`,
    );
    const setJson = await setRes.json();
    if (!setJson.ok) throw new Error(`setWebhook falló: ${setJson.description ?? "desconocido"}`);

    await redis.set(key, url, { EX: TTL_SECONDS });
  } catch (error) {
    console.error("[webhookRegistration] error:", error);
  }
}

export async function closeWebhook(botToken: string): Promise<void> {
  const key = `${PREFIX}${botToken}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    const json = await res.json();
    if (!json.ok) throw new Error(`deleteWebhook falló: ${json.description ?? "desconocido"}`);
    await redis.del(key);
  } catch (error) {
    console.error("[webhookRegistration] close error:", error);
  }
}