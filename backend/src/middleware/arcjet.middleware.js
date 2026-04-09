import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../lib/redis.js";

// In-memory limiter — always available, used until Redis is ready
const inMemoryLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Rate Limit exceeded. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Redis-backed limiter — created once when Redis connects, then reused forever
let redisLimiter = null;
redis.on("ready", () => {
    redisLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        message: { message: "Rate Limit exceeded. Please try again later." },
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
            sendCommand: (...args) => redis.call(...args),
        }),
    });
});
redis.on("close", () => { redisLimiter = null; }); // fall back if Redis drops

// Use Redis limiter when available, otherwise in-memory
export const localRateLimit = (req, res, next) =>
    (redisLimiter || inMemoryLimiter)(req, res, next);

export const arcjetProtection = async (req, res, next)=>{
    try{
        const decision = await aj.protect(req);

        if(decision.isErrored()) {
            // arcjet failed (e.g. network issue) — fall through to local rate limiter
            return next();
        }

        if(decision.isDenied())
        {
            if(decision.reason.isRateLimit())
            {
                return res.status(429).json({message: "Rate Limit exceeded. Please try again later."});
            }
            else if(decision.reason.isBot())
            {
                return res.status(403).json({message: "Bot access denied."});
            }
            else{
                return res.status(403).json({
                    message: "Access denied by security policy."
                })
            }
        }
        if(decision.results.some(isSpoofedBot))
        {
            return res.status(403).json({
                error: "Spoofed bot detected",
                message: "Malicious bot activity detected.",
            })
        }

        next();
    }catch(error)
    {
        next();
    }
};