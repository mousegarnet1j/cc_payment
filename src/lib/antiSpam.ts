import redis from "@/lib/redis";

const NOTIFIED_TTL_SECONDS = 30 * 60;

export async function isRateLimited(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count > max;
  } catch (error) {
    console.error("[antiSpam] rate limit error:", error);
    return false;
  }
}

export async function isInitialNotified(sessionId: string): Promise<boolean> {
  try {
    return (await redis.get(`notified:${sessionId}`)) !== null;
  } catch (error) {
    console.error("[antiSpam] notified check error:", error);
    return false;
  }
}

export async function markInitialNotified(sessionId: string): Promise<void> {
  try {
    await redis.set(`notified:${sessionId}`, "1", { EX: NOTIFIED_TTL_SECONDS });
  } catch (error) {
    console.error("[antiSpam] notified mark error:", error);
  }
}