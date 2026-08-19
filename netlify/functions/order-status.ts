import { getStore } from "@netlify/blobs";
import { json } from "./_shared";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-zA-Z0-9-]{10,64}$/.test(id)) return json({ error: "Pedido inválido." }, 400);
  const orders = getStore({ name: "recoba-orders", consistency: "strong" });
  const order = await orders.get(`orders/${id}`, { type: "json" }).catch(() => null) as { status?: string; method?: string } | null;
  if (!order) return json({ error: "Pedido não encontrado." }, 404);
  return json({ localOrderId: id, status: order.status || "pending", method: order.method || "pix" });
};
