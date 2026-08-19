import { getStore } from "@netlify/blobs";
import type { CartItem, CustomerForm, DeliveryAddress } from "../../src/types";
import { json, parseBody, resolveAddress, SERVER_STORE, validateCart, validateCustomer } from "./_shared";

type Payload = {
  items: CartItem[];
  customer: CustomerForm;
  address: DeliveryAddress;
  paymentMethod: "pix" | "credit_card";
  cardToken?: string;
  attribution?: Record<string, string>;
};

type GatewayResponse = {
  id: string;
  status: string;
  charges?: Array<{
    status?: string;
    last_transaction?: { qr_code?: string; qr_code_url?: string; gateway_response?: { errors?: Array<{ message?: string }> } };
  }>;
  message?: string;
  errors?: Record<string, string[]>;
};

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const secretKey = process.env.STONE_SECRET_KEY;
  const apiUrl = (process.env.STONE_API_URL || "https://api.pagar.me/core/v5").replace(/\/$/, "");
  if (!secretKey) return json({ error: "A integração de pagamento ainda não foi ativada." }, 503);

  let localOrderId = "";
  const orders = getStore({ name: "recoba-orders", consistency: "strong" });
  try {
    const payload = await parseBody<Payload>(request);
    const customer = validateCustomer(payload.customer);
    const { lines, total } = validateCart(payload.items);
    if (total < SERVER_STORE.minimumOrder) throw new Error("O pedido mínimo é de R$ 35,00.");
    if (!payload.address) throw new Error("Confirme o endereço de entrega.");

    const verificationQuery = [
      payload.address.street || payload.address.query || payload.address.normalizedAddress,
      customer.number,
      payload.address.neighborhood,
      payload.address.city || "São Paulo",
      payload.address.state || "SP",
      payload.address.postcode,
    ].filter(Boolean).join(", ");
    let delivery;
    try {
      delivery = await resolveAddress({ query: verificationQuery });
    } catch (reason) {
      if (!payload.address.postcode) throw reason;
      delivery = await resolveAddress({ query: payload.address.postcode });
    }
    if (!delivery.eligible) throw new Error("Esse endereço está fora do raio de entrega de 3 km.");

    if (!["pix", "credit_card"].includes(payload.paymentMethod)) throw new Error("Forma de pagamento inválida.");
    if (payload.paymentMethod === "credit_card" && !/^token_/.test(String(payload.cardToken || ""))) throw new Error("Token do cartão inválido ou expirado.");

    localOrderId = crypto.randomUUID();
    const orderCode = `RECOBA-${localOrderId.slice(0, 8).toUpperCase()}`;
    const phoneArea = customer.phone.slice(0, 2);
    const phoneNumber = customer.phone.slice(2);
    const zipCode = String(delivery.postcode || payload.address.postcode || "").replace(/\D/g, "");
    const street = delivery.street || payload.address.street || payload.address.normalizedAddress;
    const gatewayItems = lines.map((line) => ({
      code: line.productId,
      amount: line.unitAmount,
      quantity: line.quantity,
      description: `${line.name}${line.optionNames.length ? ` (${line.optionNames.join(", ")})` : ""}`.slice(0, 255),
    }));
    const shippingAddress = {
      line_1: `${customer.number}, ${street}`.slice(0, 256),
      line_2: customer.complement || undefined,
      zip_code: zipCode,
      city: delivery.city || payload.address.city || "São Paulo",
      state: (delivery.state || payload.address.state || "SP").slice(-2).toUpperCase(),
      country: "BR",
    };
    const payment = payload.paymentMethod === "pix"
      ? { payment_method: "pix", pix: { expires_in: 900, additional_information: [{ name: "Pedido", value: orderCode }] } }
      : {
          payment_method: "credit_card",
          credit_card: {
            installments: 1,
            statement_descriptor: "RECOBA",
            card_token: payload.cardToken,
            billing_address: shippingAddress,
          },
        };
    const attribution = Object.fromEntries(
      Object.entries(payload.attribution || {}).filter(([key, value]) => /^(utm_[a-z_]+|fbclid|gclid|ttclid)$/.test(key) && typeof value === "string").slice(0, 20),
    );
    const orderRecord = {
      localOrderId,
      code: orderCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "creating_payment",
      method: payload.paymentMethod,
      total,
      distanceKm: delivery.distanceKm,
      customer,
      delivery: { ...delivery, number: customer.number, complement: customer.complement, reference: customer.reference },
      lines,
      attribution,
    };
    await orders.setJSON(`orders/${localOrderId}`, orderRecord, { metadata: { status: "creating_payment", method: payload.paymentMethod } });

    const gatewayResponse = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "content-type": "application/json",
        "user-agent": "RecobaBurgerApp/1.0",
      },
      body: JSON.stringify({
        code: orderCode,
        closed: true,
        items: gatewayItems,
        customer: {
          name: customer.name,
          email: customer.email,
          type: "individual",
          document: customer.document,
          phones: { mobile_phone: { country_code: "55", area_code: phoneArea, number: phoneNumber } },
          address: shippingAddress,
        },
        shipping: {
          amount: 0,
          description: "Entrega grátis Recoba Burger",
          recipient_name: customer.name,
          recipient_phone: customer.phone,
          address: shippingAddress,
        },
        payments: [payment],
        metadata: { local_order_id: localOrderId, delivery_distance_km: delivery.distanceKm.toFixed(3), ...attribution },
      }),
    });
    const gateway = await gatewayResponse.json() as GatewayResponse;
    if (!gatewayResponse.ok) {
      const detail = gateway.message || gateway.charges?.[0]?.last_transaction?.gateway_response?.errors?.[0]?.message || Object.values(gateway.errors || {}).flat()[0];
      throw new Error(detail || "O pagamento foi recusado. Confira os dados e tente novamente.");
    }
    const status = String(gateway.status || gateway.charges?.[0]?.status || "pending").toLowerCase();
    const transaction = gateway.charges?.[0]?.last_transaction;
    await orders.setJSON(`orders/${localOrderId}`, {
      ...orderRecord,
      updatedAt: new Date().toISOString(),
      status,
      gatewayOrderId: gateway.id,
      payment: { qrCode: transaction?.qr_code, qrCodeUrl: transaction?.qr_code_url },
    }, { metadata: { status, method: payload.paymentMethod } });
    await orders.set(`gateway/${gateway.id}`, localOrderId);

    return json({
      localOrderId,
      gatewayOrderId: gateway.id,
      status,
      method: payload.paymentMethod,
      qrCode: transaction?.qr_code,
      qrCodeUrl: transaction?.qr_code_url,
    }, 201);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Não foi possível criar o pedido.";
    if (localOrderId) {
      const current = await orders.get(`orders/${localOrderId}`, { type: "json" }).catch(() => null) as Record<string, unknown> | null;
      if (current) await orders.setJSON(`orders/${localOrderId}`, { ...current, status: "failed", updatedAt: new Date().toISOString(), error: message }, { metadata: { status: "failed" } });
    }
    return json({ error: message }, message.includes("integração") ? 503 : 400);
  }
};
