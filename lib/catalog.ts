import { database } from "./neon";
import { env } from "cloudflare:workers";
import { getDemoCatalog } from "./demo-catalog";

type RecordRow = Record<string, unknown>;

export function mapCategory(row: RecordRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export function mapProduct(row: RecordRow) {
  return {
    id: row.id,
    categoryId: row.category_id,
    category: row.category_name ?? "Sem categoria",
    name: row.name,
    slug: row.slug,
    description: row.description,
    material: row.materials ?? "",
    widthCm: row.width_cm === null ? null : Number(row.width_cm),
    heightCm: row.height_cm === null ? null : Number(row.height_cm),
    depthCm: row.depth_cm === null ? null : Number(row.depth_cm),
    priceCents: row.price_cents,
    stockQuantity: row.stock_quantity,
    madeToOrder: row.made_to_order,
    status: row.status,
    featured: row.featured,
    imageUrl: row.image_url ?? "",
    glbUrl: row.glb_url ?? "",
    usdzUrl: row.usdz_url ?? "",
    demo: false,
    imagePosition: null,
  };
}

export async function getCatalog(includeDrafts = false) {
  const sql = database();
  const categories = await sql.query(
    `SELECT id, name, slug, description, active, sort_order
     FROM categories ${includeDrafts ? "" : "WHERE active = true"}
     ORDER BY sort_order, name`,
  );
  const products = await sql.query(
    `SELECT p.*, c.name AS category_name,
      (SELECT url FROM product_media WHERE product_id = p.id AND kind = 'image' ORDER BY sort_order, created_at LIMIT 1) AS image_url,
      (SELECT url FROM product_media WHERE product_id = p.id AND kind = 'glb' ORDER BY sort_order, created_at LIMIT 1) AS glb_url,
      (SELECT url FROM product_media WHERE product_id = p.id AND kind = 'usdz' ORDER BY sort_order, created_at LIMIT 1) AS usdz_url
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     ${includeDrafts ? "" : "WHERE p.status = 'active' AND (c.active = true OR c.id IS NULL)"}
     ORDER BY p.featured DESC, p.created_at DESC`,
  );
  if (!includeDrafts && !products.length && env.DEMO_CATALOG === "true") {
    return getDemoCatalog();
  }
  return {
    demo: false,
    categories: categories.map(mapCategory),
    products: products.map(mapProduct),
  };
}
