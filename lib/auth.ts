import { createNeonAuth } from "@neon/auth/next/server";
import { env } from "cloudflare:workers";

if (!env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error("Neon Auth não está configurado no ambiente.");
}

export function getAuth() {
  if (!env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET) {
    throw new Error("Neon Auth não está configurado no ambiente.");
  }
  return createNeonAuth({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
  });
}
