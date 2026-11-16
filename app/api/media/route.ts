import { requireAdmin } from "../../../lib/admin";
import { json } from "../../../lib/neon";
import { getStorageClient } from "../../../lib/storage";

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

export function matchesSignature(bytes: Uint8Array, extension: string) {
  const ascii = (offset: number, value: string) => value.split("").every((char,index) => bytes[offset+index] === char.charCodeAt(0));
  if (extension === "jpg") return bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  if (extension === "png") return [137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte);
  if (extension === "webp") return ascii(0,"RIFF") && ascii(8,"WEBP");
  if (extension === "glb") return ascii(0,"glTF") && bytes[4]===2;
  if (extension === "usdz") return ascii(0,"PK") && bytes[2]===3 && bytes[3]===4;
  return false;
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return json({ error: "Origem não permitida." }, 403);
    }
    const { response } = await requireAdmin();
    if (response) return response;
    const storage = getStorageClient();
    if (!storage) return json({ error: "O armazenamento de mídia não está configurado." }, 503);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return json({ error: "Selecione um arquivo." }, 400);
    const type = fileType(file);
    if (!type) return json({ error: "Envie uma imagem JPG, PNG ou WebP, ou um modelo GLB/USDZ." }, 415);
    if (file.size > type.limit) return json({ error: `O arquivo excede o limite de ${Math.floor(type.limit / 1024 / 1024)} MB.` }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesSignature(bytes,type.extension)) return json({error:"O conteúdo do arquivo não corresponde ao formato informado."},415);
    const key = `products/${crypto.randomUUID()}.${type.extension}`;
    const saved = await storage.put(key, bytes, type.contentType);
    if (!saved.ok) throw new Error(`Falha no armazenamento: HTTP ${saved.status}`);
    return json({ url: `/api/media/${key}`, key }, 201);
  } catch (error) {
    console.error("Media upload failed", {type:error instanceof Error ? error.name : "UnknownError"});
    return json({ error: "Não foi possível salvar o arquivo." }, 500);
  }
}
