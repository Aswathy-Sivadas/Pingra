import Redis from "ioredis";
import { ENV } from "./env.js";

// ─── Create Redis client ────────────────────────────────────────────────────
// maxRetriesPerRequest: null  → queue commands while disconnected instead of
//   rejecting them immediately (prevents "Connection is closed" crashes).
// retryStrategy            → exponential backoff, capped at 30s, tries forever.
//   This means the app auto-recovers when Redis comes back online.
const redis = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        const delay = Math.min(times * 500, 30000); // 500ms → 30s cap
        console.warn(`Redis: reconnect attempt #${times} in ${delay}ms`);
        return delay;
    },
});

redis.on("connect", () => console.log("✅ Redis connected"));
// "error" listener MUST exist — without it Node.js crashes on unhandled EventEmitter errors
redis.on("error", (err) => console.warn("⚠️  Redis error:", err.message));

export default redis;

// ─── ONLINE USERS ──────────────────────────────────────────────────────────
// We store online users in a Redis Hash called "onlineUsers"
// Hash structure:  onlineUsers  →  { userId: socketId, userId2: socketId2, ... }

export async function setUserSocket(userId, socketId) {
    try { await redis.hset("onlineUsers", userId, socketId); }
    catch (e) { console.warn("Redis setUserSocket failed:", e.message); }
}

export async function removeUserSocket(userId) {
    try { await redis.hdel("onlineUsers", userId); }
    catch (e) { console.warn("Redis removeUserSocket failed:", e.message); }
}

export async function getReceiverSocketId(userId) {
    try { return await redis.hget("onlineUsers", userId); }
    catch (e) { console.warn("Redis getReceiverSocketId failed:", e.message); return null; }
}

export async function getOnlineUserIds() {
    try {
        const map = await redis.hgetall("onlineUsers"); // returns { userId: socketId, ... }
        return Object.keys(map || {});
    } catch (e) {
        console.warn("Redis getOnlineUserIds failed:", e.message);
        return [];
    }
}

// ─── PUBLIC KEY CACHE ──────────────────────────────────────────────────────
const KEY_TTL = 5 * 60; // 5 minutes in seconds

export async function getCachedPublicKey(userId) {
    try { return await redis.get(`pubkey:${userId}`); }
    catch (e) { return null; } // cache miss — caller will fallback to MongoDB
}

export async function setCachedPublicKey(userId, publicKey) {
    try { await redis.set(`pubkey:${userId}`, publicKey, "EX", KEY_TTL); }
    catch (e) { /* non-critical — app works without caching */ }
}

export async function invalidateCachedPublicKey(userId) {
    try { await redis.del(`pubkey:${userId}`); }
    catch (e) { /* non-critical */ }
}
