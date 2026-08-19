import menuData from "../../src/data/menu.json";
import type { CartItem, CustomerForm, DeliveryAddress, MenuCatalog } from "../../src/types";

export const SERVER_STORE = {
  latitude: -23.491526843,
  longitude: -46.628522336,
  radiusKm: 3,
  minimumOrder: 3_500,
  opensAt: 17,
  closesAt: 23,
  timezone: "America/Sao_Paulo",
} as const;

const catalog = menuData as MenuCatalog;
const products = new Map(catalog.categories.flatMap((category) => category.products).map((product) => [product.id, product]));

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

export const parseBody = async <T>(request: Request): Promise<T> => {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("Formato de requisição inválido.");
  return request.json() as Promise<T>;
};

export const haversineKm = (latitude: number, longitude: number) => {
  const earthRadius = 6_371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDistance = toRadians(latitude - SERVER_STORE.latitude);
  const longitudeDistance = toRadians(longitude - SERVER_STORE.longitude);
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(toRadians(SERVER_STORE.latitude)) * Math.cos(toRadians(latitude)) * Math.sin(longitudeDistance / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const isStoreOpen = () => true;

type GeocodeInput = { query?: string; latitude?: number; longitude?: number };

const normalizeGeocode = (data: Omit<DeliveryAddress, "distanceKm" | "eligible">): DeliveryAddress => {
  const distanceKm = haversineKm(data.latitude, data.longitude);
  return { ...data, distanceKm, eligible: distanceKm <= SERVER_STORE.radiusKm };
};

const geocodeWithGoogle = async (query: string): Promise<DeliveryAddress | null> => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "br");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", key);
  const response = await fetch(url);
  if (!response.ok) return null;
  const payload = await response.json() as {
    results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } }; address_components: Array<{ long_name: string; short_name: string; types: string[] }> }>;
  };
  const result = payload.results?.[0];
  if (!result) return null;
  const component = (type: string, short = false) => {
    const row = result.address_components.find((item) => item.types.includes(type));
    return row ? (short ? row.short_name : row.long_name) : undefined;
  };
  return normalizeGeocode({
    query,
    normalizedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    postcode: component("postal_code"),
    street: component("route"),
    neighborhood: component("sublocality") || component("sublocality_level_1"),
    city: component("administrative_area_level_2"),
    state: component("administrative_area_level_1", true),
  });
};

const geocodeCep = async (cep: string): Promise<DeliveryAddress | null> => {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
    headers: { "user-agent": "RecobaBurgerApp/1.0" },
  });
  if (!response.ok) return null;
  const data = await response.json() as {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    location?: { coordinates?: { latitude?: string; longitude?: string } };
  };
  const latitude = Number(data.location?.coordinates?.latitude);
  const longitude = Number(data.location?.coordinates?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return normalizeGeocode({
    query: cep,
    normalizedAddress: `${data.street}, ${data.neighborhood}, ${data.city} - ${data.state}, CEP ${data.cep}`,
    latitude,
    longitude,
    postcode: data.cep,
    street: data.street,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
  });
};

const geocodeNominatim = async (query: string): Promise<DeliveryAddress | null> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: { "user-agent": "RecobaBurgerApp/1.0 contato@recobaburger.com.br", "accept-language": "pt-BR" } });
  if (!response.ok) return null;
  const rows = await response.json() as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { postcode?: string; road?: string; suburb?: string; neighbourhood?: string; city?: string; town?: string; state?: string; "ISO3166-2-lvl4"?: string };
  }>;
  const row = rows[0];
  if (!row) return null;
  return normalizeGeocode({
    query,
    normalizedAddress: row.display_name,
    latitude: Number(row.lat),
    longitude: Number(row.lon),
    postcode: row.address?.postcode,
    street: row.address?.road,
    neighborhood: row.address?.suburb || row.address?.neighbourhood,
    city: row.address?.city || row.address?.town,
    state: row.address?.["ISO3166-2-lvl4"]?.split("-").pop() || row.address?.state,
  });
};

const reverseNominatim = async (latitude: number, longitude: number): Promise<DeliveryAddress | null> => {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, { headers: { "user-agent": "RecobaBurgerApp/1.0 contato@recobaburger.com.br", "accept-language": "pt-BR" } });
  if (!response.ok) return null;
  const row = await response.json() as { display_name?: string; address?: { postcode?: string; road?: string; suburb?: string; neighbourhood?: string; city?: string; state?: string; "ISO3166-2-lvl4"?: string } };
  if (!row.display_name) return null;
  return normalizeGeocode({
    query: "Minha localização",
    normalizedAddress: row.display_name,
    latitude,
    longitude,
    postcode: row.address?.postcode,
    street: row.address?.road,
    neighborhood: row.address?.suburb || row.address?.neighbourhood,
    city: row.address?.city,
    state: row.address?.["ISO3166-2-lvl4"]?.split("-").pop() || row.address?.state,
  });
};

export const resolveAddress = async (input: GeocodeInput): Promise<DeliveryAddress> => {
  if (Number.isFinite(input.latitude) && Number.isFinite(input.longitude)) {
    return (await reverseNominatim(Number(input.latitude), Number(input.longitude))) || normalizeGeocode({
      query: "Minha localização",
      normalizedAddress: "Localização atual",
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
    });
  }
  const query = String(input.query || "").trim().slice(0, 220);
  if (query.length < 5) throw new Error("Digite um CEP ou endereço válido.");
  const digits = query.replace(/\D/g, "");
  const result =
    (await geocodeWithGoogle(query)) ||
    (digits.length === 8 && /^\D*\d[\d\D]*$/.test(query) ? await geocodeCep(digits) : null) ||
    (await geocodeNominatim(`${query}, São Paulo, SP, Brasil`));
  if (!result) throw new Error("Não encontramos esse endereço. Confira o CEP e o número.");
  return result;
};

export type ValidatedLine = {
  productId: string;
  name: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  optionNames: string[];
  note: string;
};

export const validateCart = (items: CartItem[]) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw new Error("Sua sacola está vazia ou inválida.");
  const lines: ValidatedLine[] = items.map((item) => {
    const product = products.get(String(item.productId));
    if (!product) throw new Error("Um item da sacola não está mais disponível.");
    const quantity = Math.max(1, Math.min(20, Math.trunc(Number(item.quantity))));
    const optionNames: string[] = [];
    let optionAmount = 0;
    for (const group of product.groups) {
      const received = new Set(
        (Array.isArray(item.options) ? item.options : [])
          .filter((option) => option.groupId === group.id)
          .map((option) => String(option.id)),
      );
      if (received.size < group.minimum || received.size > group.maximum) throw new Error(`Confira as escolhas de ${product.name}.`);
      for (const optionId of received) {
        const option = group.options.find((row) => row.id === optionId);
        if (!option) throw new Error(`Uma opção de ${product.name} não está mais disponível.`);
        optionAmount += option.price;
        optionNames.push(option.name);
      }
    }
    if (product.price === 0 && optionAmount === 0) throw new Error(`${product.name} não está disponível para pedido avulso.`);
    const unitAmount = product.price + optionAmount;
    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitAmount,
      totalAmount: unitAmount * quantity,
      optionNames,
      note: String(item.note || "").trim().slice(0, 180),
    };
  });
  return { lines, total: lines.reduce((sum, line) => sum + line.totalAmount, 0) };
};

export const validateCustomer = (customer: CustomerForm) => {
  const clean = {
    name: String(customer?.name || "").trim().slice(0, 64),
    email: String(customer?.email || "").trim().toLowerCase().slice(0, 64),
    phone: String(customer?.phone || "").replace(/\D/g, "").slice(-11),
    document: String(customer?.document || "").replace(/\D/g, "").slice(0, 14),
    number: String(customer?.number || "").trim().slice(0, 20),
    complement: String(customer?.complement || "").trim().slice(0, 80),
    reference: String(customer?.reference || "").trim().slice(0, 100),
  };
  if (clean.name.split(/\s+/).length < 2) throw new Error("Informe o nome completo.");
  if (!/^\S+@\S+\.\S+$/.test(clean.email)) throw new Error("Informe um e-mail válido.");
  if (clean.phone.length < 10) throw new Error("Informe um telefone com DDD.");
  if (clean.document.length !== 11) throw new Error("Informe um CPF válido.");
  if (!clean.number) throw new Error("Informe o número do endereço.");
  return clean;
};
