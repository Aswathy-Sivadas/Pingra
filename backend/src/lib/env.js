//todo
import "dotenv/config";
export const ENV = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    CLIENT_URL: process.env.CLIENT_URL ,
    CLOUDINARY_CLOUD_NAME:process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY:process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET:process.env.CLOUDINARY_API_SECRET,
    ARCJET_KEY:process.env.ARCJET_KEY,
    ARCJET_ENV:process.env.ARCJET_ENV,
    // Redis connection string — defaults to local Redis on port 6379
    REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    // In production on Render, RENDER_EXTERNAL_URL is injected automatically.
    // CLIENT_URL takes priority (useful for custom domains).
    CLIENT_URL: process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || process.env.CLIENT_URL,
}