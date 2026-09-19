import redis from "@/lib/redis";

const TTL_SECONDS = 30 * 60;
const PREFIX = "session-creds:";

export interface SessionCredentials {
  botToken: string;
  chatId: string;
}

export async function saveSessionCredentials(
  sessionId: string,
  creds: SessionCredentials,
): Promise<void> {
  try {
    await redis.set(`${PREFIX}${sessionId}`, JSON.stringify(creds), { EX: TTL_SECONDS });
  } catch (error) {
    console.error("Error saving session creds:", error);
  }
}

export async function getSessionCredentials(
  sessionId: string,
): Promise<SessionCredentials | null> {
  try {
    const raw = await redis.get(`${PREFIX}${sessionId}`);
    return raw ? (JSON.parse(raw) as SessionCredentials) : null;
  } catch (error) {
    console.error("Error reading session creds:", error);
    return null;
  }
}