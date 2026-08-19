import type { CartItem, CustomerForm, DeliveryAddress, PaymentConfig, PaymentResult } from "../types";

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível concluir. Tente novamente.");
  return body;
};

export const getPaymentConfig = async () => parseResponse<PaymentConfig>(await fetch("/api/config"));

export const geocodeAddress = async (payload: { query?: string; latitude?: number; longitude?: number }) =>
  parseResponse<DeliveryAddress>(
    await fetch("/api/geocode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );

export const tokenizeCard = async (
  publicKey: string,
  card: { number: string; holderName: string; expMonth: string; expYear: string; cvv: string },
) => {
  const response = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(publicKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "card",
      card: {
        number: card.number.replace(/\D/g, ""),
        holder_name: card.holderName,
        exp_month: Number(card.expMonth),
        exp_year: Number(card.expYear),
        cvv: card.cvv.replace(/\D/g, ""),
      },
    }),
  });
  return parseResponse<{ id: string }>(response);
};

export const createOrder = async (payload: {
  items: CartItem[];
  customer: CustomerForm;
  address: DeliveryAddress;
  paymentMethod: "pix" | "credit_card";
  cardToken?: string;
  attribution: Record<string, string>;
}) =>
  parseResponse<PaymentResult>(
    await fetch("/api/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );

export const getOrderStatus = async (localOrderId: string) =>
  parseResponse<Pick<PaymentResult, "localOrderId" | "status" | "method">>(
    await fetch(`/api/order-status?id=${encodeURIComponent(localOrderId)}`),
  );
