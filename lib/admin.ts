import { getChatGPTUser } from "../app/chatgpt-auth";
import { database, json } from "./neon";

export async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return { response: json({ error: "Entre na sua conta para continuar." }, 401) };
  const sql = database();
  const rows = await sql.query(
    "SELECT role FROM admin_memberships WHERE email = $1 LIMIT 1",
    [user.email.toLowerCase()],
  );
  if (!rows.length) return { response: json({ error: "Esta conta não tem acesso ao painel." }, 403) };
  return { user, role: rows[0].role as string };
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) {
    return json({ error: "Origem não permitida." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Envie dados em JSON." }, 415);
  }
  return null;
}

export async function readBody(request: Request) {
  const body = await request.text();
  if (body.length > 16_000) throw new Error("Dados muito extensos");
  return JSON.parse(body) as Record<string, unknown>;
}

export function value(input: unknown, max = 200) {
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

export function slug(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

export function validId(input: unknown) {
  return typeof input === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

export function publicMediaUrl(input: unknown) {
  const raw = value(input, 2000);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
