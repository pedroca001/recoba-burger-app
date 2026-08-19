export type MenuOption = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type MenuGroup = {
  id: string;
  name: string;
  hint: string;
  minimum: number;
  maximum: number;
  options: MenuOption[];
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  image: string | null;
  groups: MenuGroup[];
};

export type MenuCategory = {
  id: string;
  name: string;
  products: MenuProduct[];
};

export type MenuCatalog = {
  importedAt: string;
  source: string;
  categories: MenuCategory[];
};

export type SelectedOption = MenuOption & { groupId: string; groupName: string };

export type CartItem = {
  lineId: string;
  productId: string;
  name: string;
  image: string | null;
  basePrice: number;
  compareAtPrice?: number;
  quantity: number;
  options: SelectedOption[];
  note: string;
};

export type DeliveryAddress = {
  query: string;
  normalizedAddress: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  eligible: boolean;
  postcode?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

export type PaymentConfig = {
  paymentsConfigured: boolean;
  publicKey: string | null;
  store: {
    minimumOrder: number;
    deliveryRadiusKm: number;
    opensAt: number;
    closesAt: number;
    timezone: string;
  };
};

export type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  document: string;
  number: string;
  complement: string;
  reference: string;
};

export type PaymentResult = {
  localOrderId: string;
  gatewayOrderId?: string;
  status: string;
  method: "pix" | "credit_card";
  qrCode?: string;
  qrCodeUrl?: string;
  message?: string;
};
