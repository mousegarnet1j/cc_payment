import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { __redis?: Redis };

const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export const redis = globalForRedis.__redis ?? new Redis(url);

if (process.env.NODE_ENV !== "production") globalForRedis.__redis = redis;

export default redis;