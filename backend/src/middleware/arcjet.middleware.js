import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";
import rateLimit from "express-rate-limit";

// Local fallback rate limiter (used when arcjet can't connect)
export const localRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { message: "Rate Limit exceeded. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

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