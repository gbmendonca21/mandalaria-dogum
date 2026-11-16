import { json } from "../../../../lib/neon";
import { getStorageClient } from "../../../../lib/storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const storage = getStorageClient();
  if (!storage) return json({ error: "O armazenamento de mídia não está configurado." }, 503);
  const { key } = await context.params;
  const objectKey = Array.isArray(key) ? key.join("/") : "";
  if (!/^products\/[0-9a-f-]+\.(jpg|png|webp|glb|usdz)$/i.test(objectKey)) {
    return json({ error: "Arquivo não encontrado." }, 404);
  }
  let object;
  try {
    object = await storage.get(objectKey);
  } catch (error) {
    console.error("Media download failed", {type:error instanceof Error ? error.name : "UnknownError"});
    return json({ error: "Não foi possível carregar o arquivo." }, 502);
  }
  if (object.status === 404) return json({ error: "Arquivo não encontrado." }, 404);
  if (!object.ok || !object.body) return json({ error: "Não foi possível carregar o arquivo." }, 502);
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "etag", "last-modified"]) {
    const value = object.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
