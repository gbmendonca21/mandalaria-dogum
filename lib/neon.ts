import { env } from "cloudflare:workers";
import { neon } from "@neondatabase/serverless";

export function database() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
  return neon(env.DATABASE_URL);
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function errorResponse(error: unknown) {
  console.error("Neon/API error", error);
  return json({ error: "Não foi possível acessar os dados da loja agora." }, 503);
}
