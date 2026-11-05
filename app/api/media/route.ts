import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../lib/admin";
import { json } from "../../../lib/neon";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_MODEL_BYTES = 50 * 1024 * 1024;

const extensions: Record<string, { extension: string; contentType: string; limit: number }> = {
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg", limit: MAX_IMAGE_BYTES },
  "image/png": { extension: "png", contentType: "image/png", limit: MAX_IMAGE_BYTES },
  "image/webp": { extension: "webp", contentType: "image/webp", limit: MAX_IMAGE_BYTES },
};

function fileType(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extensions[file.type]) return extensions[file.type];
  if (extension === "glb") return { extension: "glb", contentType: "model/gltf-binary", limit: MAX_MODEL_BYTES };
  if (extension === "usdz") return { extension: "usdz", contentType: "model/vnd.usdz+zip", limit: MAX_MODEL_BYTES };
  return null;
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return json({ error: "Origem não permitida." }, 403);
    }
    const { response } = await requireAdmin();
    if (response) return response;
    if (!env.BUCKET) return json({ error: "O armazenamento de mídia não está configurado." }, 503);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return json({ error: "Selecione um arquivo." }, 400);
    const type = fileType(file);
    if (!type) return json({ error: "Envie uma imagem JPG, PNG ou WebP, ou um modelo GLB/USDZ." }, 415);
    if (file.size > type.limit) return json({ error: `O arquivo excede o limite de ${Math.floor(type.limit / 1024 / 1024)} MB.` }, 413);
    const key = `products/${crypto.randomUUID()}.${type.extension}`;
    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: type.contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: file.name.slice(0, 200) },
    });
    return json({ url: `/api/media/${key}`, key }, 201);
  } catch (error) {
    console.error("Media upload failed", error);
    return json({ error: "Não foi possível salvar o arquivo." }, 500);
  }
}
