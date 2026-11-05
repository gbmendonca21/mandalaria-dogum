import { env } from "cloudflare:workers";
import { database, errorResponse, json } from "../../../lib/neon";
import { value, validId } from "../../../lib/admin";

export const dynamic = "force-dynamic";

type CheckoutItem = { productId: string; quantity: number };

function parseAddress(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const address = input as Record<string, unknown>;
  const name = value(address.name, 120);
  const email = value(address.email, 250).toLowerCase();
  const phone = value(address.phone, 30).replace(/\D/g, "");
  const zipCode = value(address.zipCode, 12).replace(/\D/g, "");
  const street = value(address.street, 180);
  const number = value(address.number, 30);
  const complement = value(address.complement, 120);
  const neighborhood = value(address.neighborhood, 100);
  const city = value(address.city, 100);
  const state = value(address.state, 2).toUpperCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 10 || phone.length > 13 ||
      zipCode.length !== 8 || !street || !number || !neighborhood || !city || !/^[A-Z]{2}$/.test(state)) return null;
  return { name, email, phone, zipCode, street, number, complement, neighborhood, city, state };
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Origem não permitida." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Envie dados em JSON." }, 415);
    if (!env.MERCADOPAGO_ACCESS_TOKEN) return json({ error: "O pagamento ainda não está configurado." }, 503);
    const shippingCents = Number(env.SHIPPING_CENTS);
    if (!Number.isSafeInteger(shippingCents) || shippingCents < 0) {
      return json({ error: "A loja ainda não configurou o valor do frete." }, 503);
    }
    const body = await request.json() as Record<string, unknown>;
    const customer = parseAddress(body.customer);
    const items = body.items;
    if (!customer) return json({ error: "Confira seus dados e o endereço de entrega." }, 400);
    if (!Array.isArray(items) || !items.length || items.length > 20) return json({ error: "Seu carrinho está vazio ou inválido." }, 400);
    const normalized: CheckoutItem[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") return json({ error: "Item inválido no carrinho." }, 400);
      const row = item as Record<string, unknown>;
      if (!validId(row.productId) || !Number.isSafeInteger(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > 50) {
        return json({ error: "Quantidade ou produto inválido." }, 400);
      }
      normalized.push({ productId: row.productId as string, quantity: Number(row.quantity) });
    }
    if (new Set(normalized.map(item => item.productId)).size !== normalized.length) return json({ error: "Carrinho inválido." }, 400);

    const sql = database();
    const placeholders = normalized.map((_, index) => `$${index + 1}`).join(",");
    const products = await sql.query(
      `SELECT id, name, price_cents, stock_quantity, made_to_order FROM products
       WHERE status = 'active' AND id IN (${placeholders})`,
      normalized.map(item => item.productId),
    ) as Array<{ id: string; name: string; price_cents: number; stock_quantity: number; made_to_order: boolean }>;
    if (products.length !== normalized.length) return json({ error: "Um produto do carrinho não está mais disponível." }, 409);
    const lines = normalized.map(item => {
      const product = products.find(row => row.id === item.productId)!;
      if (!product.made_to_order && product.stock_quantity < item.quantity) return null;
      return { ...item, product, lineTotal: Number(product.price_cents) * item.quantity };
    });
    if (lines.some(line => !line)) return json({ error: "O estoque de um produto mudou. Atualize o carrinho e tente novamente." }, 409);
    const validLines = lines as Array<NonNullable<(typeof lines)[number]>>;
    const subtotalCents = validLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalCents = subtotalCents + shippingCents;
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) return json({ error: "O valor do pedido é inválido." }, 400);

    const orderId = crypto.randomUUID();
    const address = {
      zipCode: customer.zipCode, street: customer.street, number: customer.number,
      complement: customer.complement, neighborhood: customer.neighborhood,
      city: customer.city, state: customer.state,
    };
    const queries = [
      sql.query(
        `INSERT INTO orders (id, customer_name, customer_email, customer_phone, status,
          payment_status, subtotal_cents, shipping_cents, total_cents, shipping_address,
          payment_provider, idempotency_key)
         VALUES ($1,$2,$3,$4,'pending_payment','pending',$5,$6,$7,$8::jsonb,'mercadopago',$1)`,
        [orderId, customer.name, customer.email, customer.phone, subtotalCents, shippingCents, totalCents, JSON.stringify(address)],
      ),
      ...validLines.map(line => sql.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, line.product.id, line.product.name, line.product.price_cents, line.quantity, line.lineTotal],
      )),
    ];
    await sql.transaction(queries);

    const origin = new URL(request.url).origin;
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
        "content-type": "application/json",
        "x-idempotency-key": orderId,
      },
      body: JSON.stringify({
        external_reference: orderId,
        items: validLines.map(line => ({
          id: line.product.id,
          title: line.product.name.slice(0, 250),
          quantity: line.quantity,
          currency_id: "BRL",
          unit_price: Number(line.product.price_cents) / 100,
        })),
        shipments: {
          mode: "not_specified",
          cost: shippingCents / 100,
          receiver_address: {
            zip_code: customer.zipCode,
            street_name: customer.street,
            street_number: customer.number,
            city_name: customer.city,
            state_name: customer.state,
            apartment: customer.complement.slice(0, 120),
          },
        },
        payer: { name: customer.name, email: customer.email },
        back_urls: {
          success: `${origin}/?payment=success&order=${orderId}`,
          pending: `${origin}/?payment=pending&order=${orderId}`,
          failure: `${origin}/?payment=failure&order=${orderId}`,
        },
        auto_return: "approved",
        notification_url: `${origin}/api/webhooks/mercadopago`,
        statement_descriptor: "MANDALARIA",
      }),
      signal: AbortSignal.timeout(12000),
    });
    const preference = await preferenceResponse.json() as { id?: string; init_point?: string; message?: string };
    if (!preferenceResponse.ok || !preference.id || !preference.init_point) {
      await sql.query("UPDATE orders SET status='cancelled', payment_status='rejected', updated_at=now() WHERE id=$1", [orderId]);
      console.error("Mercado Pago preference failed", preferenceResponse.status, preference.message || "unknown error");
      return json({ error: "Não foi possível iniciar o pagamento. Tente novamente." }, 502);
    }
    await sql.query("UPDATE orders SET payment_reference=$2, updated_at=now() WHERE id=$1", [orderId, preference.id]);
    return json({ checkoutUrl: preference.init_point, orderId });
  } catch (error) {
    return errorResponse(error);
  }
}
