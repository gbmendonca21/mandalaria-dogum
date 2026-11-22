import { database, errorResponse, json } from "../../../../../lib/neon";
import { validId } from "../../../../../lib/admin";
import { getStorageClient } from "../../../../../lib/storage";
import { createPhotoGlb } from "../../../../../lib/photo-model";

export const dynamic = "force-dynamic";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
type ProductRow = { width_cm: number | null; height_cm: number | null; image_url: string | null };

export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    if (!validId(id)) return json({error:"Prévia não encontrada."},404);
    const rows = await database().query(
      `SELECT p.width_cm,p.height_cm,
        (SELECT url FROM product_media WHERE product_id=p.id AND kind='image' ORDER BY sort_order,created_at LIMIT 1) AS image_url
       FROM products p LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.id=$1 AND p.status='active' AND (c.active=true OR c.id IS NULL) LIMIT 1`, [id],
    ) as ProductRow[];
    if (!rows.length) return json({error:"Prévia não encontrada."},404);
    const product = rows[0], width = Number(product.width_cm), height = Number(product.height_cm);
    if (![width,height].every(value=>Number.isFinite(value) && value>0 && value<=9999)) {
      return json({error:"As medidas desta peça ainda não foram informadas."},422);
    }
    // Only our private bucket is read. External image URLs never become server fetch targets.
    const key = product.image_url?.match(/^\/api\/media\/(products\/[0-9a-f-]+\.(jpg|png))$/i)?.[1];
    if (!key) return json({error:"A foto desta peça não está disponível para a prévia."},422);
    const storage = getStorageClient();
    if (!storage) return json({error:"Não foi possível preparar a prévia agora."},503);
    const object = await storage.get(key);
    if (!object.ok || !object.body) return json({error:"Não foi possível carregar a foto."},object.status===404?404:502);
    if (Number(object.headers.get("content-length"))>MAX_IMAGE_BYTES) return json({error:"Foto muito grande para a prévia."},413);
    const reader = object.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size>MAX_IMAGE_BYTES) { await reader.cancel(); return json({error:"Foto muito grande para a prévia."},413); }
      chunks.push(chunk.value);
    }
    const photo = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { photo.set(chunk,offset); offset+=chunk.byteLength; }
    const png = photo[0]===137 && [80,78,71,13,10,26,10].every((value,index)=>photo[index+1]===value);
    const jpeg = photo[0]===255 && photo[1]===216 && photo[2]===255;
    if (!png && !jpeg) return json({error:"A foto não pode ser usada nesta prévia."},415);
    const model = createPhotoGlb(photo,png?"image/png":"image/jpeg",width,height);
    return new Response(model,{headers:{"access-control-allow-origin":"*","content-type":"model/gltf-binary","content-length":String(model.byteLength),"cache-control":"public, max-age=3600","x-content-type-options":"nosniff"}});
  } catch (error) { return errorResponse(error); }
}
