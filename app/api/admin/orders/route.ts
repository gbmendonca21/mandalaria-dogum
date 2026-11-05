import { database, errorResponse, json } from "../../../../lib/neon";
import { readBody, requireAdmin, requireSameOrigin, validId } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    const rows = await database().query(
      `SELECT o.id, o.customer_name, o.customer_email, o.customer_phone, o.status,
        o.payment_status, o.subtotal_cents, o.shipping_cents, o.total_cents,
        o.shipping_address, o.created_at,
        COALESCE(json_agg(json_build_object('name', oi.product_name, 'quantity', oi.quantity,
          'unitPriceCents', oi.unit_price_cents, 'lineTotalCents', oi.line_total_cents))
          FILTER (WHERE oi.id IS NOT NULL), '[]'::json) AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`,
    );
    return json({ orders: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const denial = requireSameOrigin(request);
    if (denial) return denial;
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    const body = await readBody(request);
    if (!validId(body.id) || !["preparing", "shipped", "delivered"].includes(String(body.status))) {
      return json({ error: "Atualização de pedido inválida." }, 400);
    }
    const rows = await database().query(
      `UPDATE orders SET status=$2, updated_at=now()
       WHERE id=$1 AND payment_status='approved' AND status IN ('paid','preparing','shipped')
       RETURNING id`,
      [body.id, body.status],
    );
    return rows.length ? json({ ok: true }) : json({ error: "Pedido não encontrado ou ainda não pago." }, 409);
  } catch (error) {
    return errorResponse(error);
  }
}
