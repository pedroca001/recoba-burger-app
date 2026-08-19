import { json, SERVER_STORE } from "./_shared";

export default async () => {
  const publicKey = process.env.STONE_PUBLIC_KEY || null;
  const paymentsConfigured = Boolean(publicKey && process.env.STONE_SECRET_KEY);
  return json({
    paymentsConfigured,
    publicKey: paymentsConfigured ? publicKey : null,
    store: {
      minimumOrder: SERVER_STORE.minimumOrder,
      deliveryRadiusKm: SERVER_STORE.radiusKm,
      opensAt: SERVER_STORE.opensAt,
      closesAt: SERVER_STORE.closesAt,
      timezone: SERVER_STORE.timezone,
    },
  });
};
