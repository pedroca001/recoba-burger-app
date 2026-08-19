import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";
import { json } from "./_shared";

const equal = (received: string, expected: string) => {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const expectedToken = process.env.STONE_WEBHOOK_TOKEN;
  const receivedToken = new URL(request.url).searchParams.get("token") || "";
  if (!expectedToken || !equal(receivedToken, expectedToken)) return json({ error: "Webhook não autorizado." }, 401);

  try {
    const payload = await request.json() as {
      type?: string;
      event?: string;
      data?: {
        id?: string;
        status?: string;
        metadata?: { local_order_id?: string };
        order?: { id?: string; status?: string; metadata?: { local_order_id?: string } };
      };
    };
    const event = String(payload.type || payload.event || "").toLowerCase();
    const data = payload.data || {};
    const gatewayOrderId = data.order?.id || data.id || "";
    const orders = getStore({ name: "recoba-orders", consistency: "strong" });
    let localOrderId = data.metadata?.local_order_id || data.order?.metadata?.local_order_id || "";
    if (!localOrderId && gatewayOrderId) localOrderId = (await orders.get(`gateway/${gatewayOrderId}`, { type: "text" })) || "";
    if (!localOrderId) return json({ received: true, updated: false });
    const current = await orders.get(`orders/${localOrderId}`, { type: "json" }) as Record<string, unknown> | null;
    if (!current) return json({ received: true, updated: false });

    let status = String(data.order?.status || data.status || current.status || "pending").toLowerCase();
    if (event.includes("paid")) status = "paid";
    else if (event.includes("payment_failed") || event.includes("failed")) status = "failed";
    else if (event.includes("canceled")) status = "canceled";
    else if (event.includes("refunded")) status = "refunded";

    await orders.setJSON(`orders/${localOrderId}`, {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      lastWebhookEvent: event,
    }, { metadata: { status, method: String(current.method || "") } });
    return json({ received: true, updated: true });
  } catch {
    return json({ error: "Payload inválido." }, 400);
  }
};
