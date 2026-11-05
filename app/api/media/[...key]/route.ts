import { env } from "cloudflare:workers";
import { json } from "../../../../lib/neon";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!env.BUCKET) return json({ error: "O armazenamento de mídia não está configurado." }, 503);
  const { key } = await context.params;
  const objectKey = Array.isArray(key) ? key.join("/") : "";
  if (!/^products\/[0-9a-f-]+\.(jpg|png|webp|glb|usdz)$/i.test(objectKey)) {
    return json({ error: "Arquivo não encontrado." }, 404);
  }
  const object = await env.BUCKET.get(objectKey);
  if (!object) return json({ error: "Arquivo não encontrado." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
