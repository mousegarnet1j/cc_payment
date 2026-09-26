import { createClient } from "redis";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = {};
  try {
    const content = readFileSync(resolve(".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // sin .env.local
  }
  return env;
}

const tokenArg = process.argv.find((a) => a.startsWith("--token="));
const token = tokenArg
  ? tokenArg.split("=")[1]
  : process.env.TELEGRAM_BOT_TOKEN || loadEnv().TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Pasa el token: npm run set-webhook -- <url> --token=<BOT_TOKEN>");
  process.exit(1);
}

const clear = process.argv.includes("--clear");
const urlArg = process.argv.find((a) => a.startsWith("http"));

const api = `https://api.telegram.org/bot${token}`;

async function clearRedisCache() {
  const redisUrl = process.env.REDIS_URL || loadEnv().REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL no definido, no se limpia la cache de webhook");
    return;
  }
  const client = createClient({ url: redisUrl });
  await client.connect();
  try {
    const key = `webhook-registered:${token}`;
    await client.del(key);
    console.log(`cache ${key} eliminada`);
  } finally {
    await client.quit();
  }
}

if (clear) {
  const res = await fetch(`${api}/deleteWebhook`);
  const json = await res.json();
  console.log("deleteWebhook:", json);
  try {
    await clearRedisCache();
  } catch (error) {
    console.warn("No se pudo limpiar la cache Redis:", error);
  }
  process.exit(0);
}

if (!urlArg) {
  console.error("Pasa la URL del túnel, p. ej.: npm run set-webhook -- https://abc123.ngrok.io");
  process.exit(1);
}

const url = `${urlArg.replace(/\/+$/, "")}/api/telegram/webhook`;
const res = await fetch(`${api}/setWebhook?url=${encodeURIComponent(url)}`);
const json = await res.json();
console.log("setWebhook:", json);