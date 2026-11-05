import { env } from "cloudflare:workers";
import { database, errorResponse, json } from "../../../../lib/neon";
import { validId } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

function signatureParts(value: string | null) {
  return Object.fromEntries((value ?? "").split(",").map(part => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
}

async function isValidSignature(request: Request, dataId: string) {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET) return false;
  const requestId = request.headers.get("x-request-id");
  const parts = signatureParts(request.headers.get("x-signature"));
  if (!requestId || !parts.ts || !parts.v1 || !/^\d+$/.test(parts.ts)) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.MERCADOPAGO_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  const expected = [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (expected.length !== parts.v1.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) mismatch |= expected.charCodeAt(index) ^ parts.v1.charCodeAt(index);
  return mismatch === 0;
}

export async function POST(request: Request) {
  try {
    if (!env.MERCADOPAGO_ACCESS_TOKEN || !env.MERCADOPAGO_WEBHOOK_SECRET) return json({ error: "Webhook não configurado." }, 503);
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id") || url.searchParams.get("id");
    const topic = url.searchParams.get("type") || url.searchParams.get("topic");
    if (topic !== "payment" || !dataId || !(await isValidSignature(request, dataId))) {
      return json({ error: "Notificação inválida." }, 401);
    }
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!paymentResponse.ok) return json({ error: "Pagamento não localizado." }, 404);
    const payment = await paymentResponse.json() as {
      id: number; status: string; external_reference: string; currency_id: string;
      transaction_amount: number; date_last_updated?: string;
    };
    if (!validId(payment.external_reference) || payment.currency_id !== "BRL") return json({ received: true });
    const sql = database();
    const orders = await sql.query(
      "SELECT total_cents, payment_status FROM orders WHERE id=$1 AND payment_provider='mercadopago' LIMIT 1",
      [payment.external_reference],
    ) as Array<{ total_cents: number; payment_status: string }>;
    if (!orders.length || Math.round(payment.transaction_amount * 100) !== Number(orders[0].total_cents)) return json({ received: true });

    const eventKey = `${payment.id}:${payment.status}:${payment.date_last_updated || "current"}`.slice(0, 200);
    const payload = JSON.stringify({ id: payment.id, status: payment.status, dateLastUpdated: payment.date_last_updated });
    if (payment.status === "approved") {
      const result = await sql.query(
        `WITH event_record AS (
           INSERT INTO payment_events (provider, external_event_id, order_id, payload)
           VALUES ('mercadopago',$1,$2,$3::jsonb)
           ON CONFLICT (provider, external_event_id) DO NOTHING RETURNING id
         ), order_mark AS (
           UPDATE orders SET payment_status='approved', status='paid', updated_at=now()
           WHERE id=$2 AND payment_status='pending' AND EXISTS (SELECT 1 FROM event_record)
           RETURNING id
         ), stock_needed AS (
           SELECT oi.product_id, oi.quantity FROM order_items oi
           JOIN products p ON p.id=oi.product_id
           WHERE oi.order_id=$2 AND p.made_to_order=false
         ), stock_update AS (
           UPDATE products p SET stock_quantity=p.stock_quantity-sn.quantity
           FROM stock_needed sn, order_mark
           WHERE p.id=sn.product_id AND p.stock_quantity>=sn.quantity
           RETURNING p.id
         ), event_done AS (
           UPDATE payment_events SET processed_at=now()
           WHERE id IN (SELECT id FROM event_record) RETURNING id
         )
         SELECT (SELECT id FROM order_mark) AS order_updated,
                COALESCE((SELECT array_agg(id) FROM stock_update), ARRAY[]::uuid[]) AS updated_stock,
                (SELECT count(*) FROM stock_needed) AS expected_stock`,
        [eventKey, payment.external_reference, payload],
      ) as Array<{ order_updated: string | null; updated_stock: string[]; expected_stock: number }>;
      const row = result[0];
      if (row?.order_updated && row.updated_stock.length !== Number(row.expected_stock)) {
        if (row.updated_stock.length) {
          await sql.query(
            `UPDATE products p SET stock_quantity=p.stock_quantity+oi.quantity
             FROM order_items oi WHERE oi.order_id=$1 AND oi.product_id=p.id AND p.id=ANY($2::uuid[])`,
            [payment.external_reference, row.updated_stock],
          );
        }
        const refund = await fetch(`https://api.mercadopago.com/v1/payments/${payment.id}/refunds`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
            "content-type": "application/json",
            "x-idempotency-key": `refund-${payment.external_reference}`,
          },
          body: "{}",
          signal: AbortSignal.timeout(10000),
        });
        await sql.query(
          "UPDATE orders SET status=$2, payment_status=$3, updated_at=now() WHERE id=$1",
          [payment.external_reference, refund.ok ? "refunded" : "cancelled", refund.ok ? "refunded" : "approved"],
        );
      }
    } else {
      await sql.query(
        `WITH event_record AS (
           INSERT INTO payment_events (provider, external_event_id, order_id, payload)
           VALUES ('mercadopago',$1,$2,$3::jsonb)
           ON CONFLICT (provider, external_event_id) DO NOTHING RETURNING id
         ), order_update AS (
           UPDATE orders SET updated_at=now()
           WHERE id=$2 AND payment_status='pending' AND EXISTS (SELECT 1 FROM event_record)
           RETURNING id
         ), event_done AS (
           UPDATE payment_events SET processed_at=now() WHERE id IN (SELECT id FROM event_record) RETURNING id
         ) SELECT 1`,
        [eventKey, payment.external_reference, payload],
      );
    }
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}
