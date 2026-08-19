import type { CartItem } from "../types";

export const itemUnitTotal = (item: CartItem) =>
  item.basePrice + item.options.reduce((sum, option) => sum + option.price, 0);

export const itemTotal = (item: CartItem) => itemUnitTotal(item) * item.quantity;

export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + itemTotal(item), 0);

export const cartQuantity = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);

export const itemSavings = (item: CartItem) =>
  Math.max(0, (item.compareAtPrice || 0) - item.basePrice) * item.quantity;

export const cartSavings = (items: CartItem[]) => items.reduce((sum, item) => sum + itemSavings(item), 0);
