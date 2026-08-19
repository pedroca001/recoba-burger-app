export const STORE = {
  name: "Recoba Burger",
  address: "Rua Pedro Doll, 259 - Santana",
  latitude: -23.491526843,
  longitude: -46.628522336,
  radiusKm: 3,
  minimumOrder: 3_500,
  opensAt: 17,
  closesAt: 23,
  timezone: "America/Sao_Paulo",
} as const;

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export const digitsOnly = (value: string) => value.replace(/\D/g, "");
