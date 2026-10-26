import { readBody, requireAdmin, requireSameOrigin, slug, validId, value } from "../../../../lib/admin";
import { database, errorResponse, json } from "../../../../lib/neon";

export const dynamic = "force-dynamic";

async function authorize(request: Request) {
  return requireSameOrigin(request) ?? (await requireAdmin()).response ?? null;
}

export async function POST(request: Request) {
  try {
    const denial = await authorize(request);
    if (denial) return denial;
    const body = await readBody(request);
    const name = value(body.name, 100);
    if (!name) return json({ error: "Informe o nome da categoria." }, 400);
    const sql = database();
    const rows = await sql.query(
      `INSERT INTO categories (name, slug, description, sort_order, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, `${slug(name)}-${crypto.randomUUID().slice(0, 8)}`, value(body.description, 500),
        Number.isInteger(body.sortOrder) ? body.sortOrder : 0, body.active !== false],
    );
    return json({ id: rows[0].id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const denial = await authorize(request);
    if (denial) return denial;
    const body = await readBody(request);
    const name = value(body.name, 100);
    if (!validId(body.id) || !name) return json({ error: "Categoria inválida." }, 400);
    const sql = database();
    const rows = await sql.query(
      `UPDATE categories SET name = $2, description = $3, sort_order = $4,
       active = $5, updated_at = now() WHERE id = $1 RETURNING id`,
      [body.id, name, value(body.description, 500),
        Number.isInteger(body.sortOrder) ? body.sortOrder : 0, body.active !== false],
    );
    return rows.length ? json({ id: rows[0].id }) : json({ error: "Categoria não encontrada." }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const denial = await authorize(request);
    if (denial) return denial;
    const body = await readBody(request);
    if (!validId(body.id)) return json({ error: "Categoria inválida." }, 400);
    const sql = database();
    const used = await sql.query("SELECT 1 FROM products WHERE category_id = $1 LIMIT 1", [body.id]);
    if (used.length) return json({ error: "Mova os produtos desta categoria antes de excluí-la." }, 409);
    const rows = await sql.query("DELETE FROM categories WHERE id = $1 RETURNING id", [body.id]);
    return rows.length ? json({ ok: true }) : json({ error: "Categoria não encontrada." }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
