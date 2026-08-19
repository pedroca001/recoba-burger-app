import type { CartItem } from "../types";

export const itemUnitTotal = (item: CartItem) =>
  item.basePrice + item.options.reduce((sum, option) => sum + option.price, 0);

export const itemTotal = (item: CartItem) => itemUnitTotal(item) * item.quantity;

export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + itemTotal(item), 0);

export const cartQuantity = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);
