import { GetObjectCommand } from "@aws-sdk/client-s3";
import { json } from "../../../../lib/neon";
import { getStorageClient, MEDIA_BUCKET } from "../../../../lib/storage";

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
    object = await storage.send(new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: objectKey }));
  } catch (error) {
    if (error && typeof error === "object" && "$metadata" in error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return json({ error: "Arquivo não encontrado." }, 404);
    }
    console.error("Media download failed", error);
    return json({ error: "Não foi possível carregar o arquivo." }, 502);
  }
  if (!object.Body) return json({ error: "Arquivo não encontrado." }, 404);
  const headers = new Headers();
  if (object.ContentType) headers.set("content-type", object.ContentType);
  if (object.ContentLength !== undefined) headers.set("content-length", String(object.ContentLength));
  if (object.ETag) headers.set("etag", object.ETag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", object.CacheControl ?? "public, max-age=31536000, immutable");
  return new Response(object.Body.transformToWebStream(), { headers });
}
