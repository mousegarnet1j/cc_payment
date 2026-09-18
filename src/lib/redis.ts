import { createClient } from "redis";

const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const globalForRedis = globalThis as unknown as { __redis?: ReturnType<typeof createClient> };

export const redis = globalForRedis.__redis ?? createClient({ url });

if (process.env.NODE_ENV !== "production") globalForRedis.__redis = redis;

redis.connect().catch((err) => console.error("[redis] connection error:", err));

export default redis;