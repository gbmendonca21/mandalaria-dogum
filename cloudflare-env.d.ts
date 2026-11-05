declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DATABASE_URL: string;
    NEON_AUTH_BASE_URL: string;
    NEON_AUTH_COOKIE_SECRET: string;
    MERCADOPAGO_ACCESS_TOKEN?: string;
    MERCADOPAGO_WEBHOOK_SECRET?: string;
    SHIPPING_CENTS?: string;
  }
}
