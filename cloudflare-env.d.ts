declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    DATABASE_URL: string;
    DEMO_CATALOG?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_ENDPOINT_URL_S3?: string;
    AWS_REGION?: string;
    NEON_AUTH_BASE_URL: string;
    NEON_AUTH_COOKIE_SECRET: string;
    MERCADOPAGO_ACCESS_TOKEN?: string;
    MERCADOPAGO_WEBHOOK_SECRET?: string;
    SHIPPING_CENTS?: string;
  }
}
