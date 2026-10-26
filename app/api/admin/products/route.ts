import { publicMediaUrl, readBody, requireAdmin, requireSameOrigin, slug, validId, value } from "../../../../lib/admin";
import { database, errorResponse, json } from "../../../../lib/neon";

export const dynamic = "force-dynamic";

type ProductInput = {
  name: string;
  categoryId: string | null;
  description: string;
  materials: string;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  priceCents: number;
  stockQuantity: number;
  madeToOrder: boolean;
  status: string;
  featured: boolean;
  imageUrl: string;
  glbUrl: string;
  usdzUrl: string;
};

async function authorize(request: Request) {
  return requireSameOrigin(request) ?? (await requireAdmin()).response ?? null;
}

function parseProduct(body: Record<string, unknown>): ProductInput | string {
  const name = value(body.name, 140);
  const categoryId = body.categoryId || null;
  const priceCents = Number(body.priceCents);
  const stockQuantity = Number(body.stockQuantity);
  const status = value(body.status, 20) || "draft";
  if (!name) return "Informe o nome do produto.";
  if (categoryId !== null && !validId(categoryId)) return "Categoria inválida.";
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) return "Preço inválido.";
  if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0) return "Estoque inválido.";
  if (!["draft", "active", "archived"].includes(status)) return "Estado inválido.";
  if (status === "active" && priceCents === 0) return "Informe o preço antes de publicar.";
  const measure = (input: unknown) => input === "" || input == null ? null : Number(input);
  const widthCm = measure(body.widthCm);
  const heightCm = measure(body.heightCm);
  const depthCm = measure(body.depthCm);
  if ([widthCm, heightCm, depthCm].some(n => n !== null && (!Number.isFinite(n) || n <= 0 || n > 9999))) {
    return "Dimensões inválidas.";
  }
  const imageUrl = publicMediaUrl(body.imageUrl);
  const glbUrl = publicMediaUrl(body.glbUrl);
  const usdzUrl = publicMediaUrl(body.usdzUrl);
  if ((body.imageUrl && !imageUrl) || (body.glbUrl && !glbUrl) || (body.usdzUrl && !usdzUrl)) {
    return "Use endereços HTTPS válidos para as mídias.";
  }
  return {
    name, categoryId: categoryId as string | null,
    description: value(body.description, 4000), materials: value(body.materials, 500),
    widthCm, heightCm, depthCm, priceCents, stockQuantity,
    madeToOrder: body.madeToOrder === true, status, featured: body.featured === true,
    imageUrl, glbUrl, usdzUrl,
  };
}

function mediaQueries(sql: ReturnType<typeof database>, id: string, input: ProductInput) {
  return [
    sql.query("DELETE FROM product_media WHERE product_id = $1", [id]),
    sql.query(
      `INSERT INTO product_media (product_id, kind, url, alt_text, sort_order)
       SELECT $1, kind, url, alt_text, sort_order FROM
       (VALUES ('image', $2::text, $5::text, 0), ('glb', $3::text, ''::text, 1),
               ('usdz', $4::text, ''::text, 2)) media(kind, url, alt_text, sort_order)
       WHERE url <> ''`,
      [id, input.imageUrl, input.glbUrl, input.usdzUrl, input.name],
    ),
  ];
}

export async function POST(request: Request) {
  try {
    const denial = await authorize(request);
    if (denial) return denial;
    const body = await readBody(request);
    const input = parseProduct(body);
    if (typeof input === "string") return json({ error: input }, 400);
    const id = crypto.randomUUID();
    const sql = database();
    await sql.transaction([
      sql.query(
        `INSERT INTO products (id, category_id, name, slug, description, materials,
          width_cm, height_cm, depth_cm, price_cents, stock_quantity, made_to_order, status, featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, input.categoryId, input.name, `${slug(input.name)}-${id.slice(0, 8)}`,
          input.description, input.materials, input.widthCm, input.heightCm, input.depthCm,
          input.priceCents, input.stockQuantity, input.madeToOrder, input.status, input.featured],
      ),
      ...mediaQueries(sql, id, input).slice(1),
    ]);
    return json({ id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const denial = await authorize(request);
    if (denial) return denial;
    const body = await readBody(request);
    if (!validId(body.id)) return json({ error: "Produto inválido." }, 400);
    const input = parseProduct(body);
    if (typeof input === "string") return json({ error: input }, 400);
    const id = body.id as string;
    const sql = database();
    const existing = await sql.query("SELECT 1 FROM products WHERE id = $1 LIMIT 1", [id]);
    if (!existing.length) return json({ error: "Produto não encontrado." }, 404);
    await sql.transaction([
      sql.query(
        `UPDATE products SET category_id=$2, name=$3, description=$4, materials=$5,
          width_cm=$6, height_cm=$7, depth_cm=$8, price_cents=$9, stock_quantity=$10,
          made_to_order=$11, status=$12, featured=$13, updated_at=now() WHERE id=$1`,
        [id, input.categoryId, input.name, input.description, input.materials,
          input.widthCm, input.heightCm, input.depthCm, input.priceCents,
          input.stockQuantity, input.madeToOrder, input.status, input.featured],
      ),
      ...mediaQueries(sql, id, input),
    ]);
    return json({ id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const denial = await authorize(request);
    if (denial) return denial;
    const body = await readBody(request);
    if (!validId(body.id)) return json({ error: "Produto inválido." }, 400);
    const sql = database();
    const rows = await sql.query("DELETE FROM products WHERE id = $1 RETURNING id", [body.id]);
    return rows.length ? json({ ok: true }) : json({ error: "Produto não encontrado." }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
