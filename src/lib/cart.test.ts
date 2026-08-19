import { describe, expect, it } from "vitest";
import { cartQuantity, cartSavings, cartTotal, itemUnitTotal } from "./cart";
import { getStoreClock } from "./hours";
import type { CartItem } from "../types";

const item: CartItem = {
  lineId: "line-1",
  productId: "1",
  name: "Burger",
  image: null,
  basePrice: 3_500,
  quantity: 2,
  note: "",
  options: [{ id: "o1", groupId: "g1", groupName: "Adicionais", name: "Bacon", description: "", price: 400 }],
};

describe("cart totals", () => {
  it("soma adicionais ao preço unitário", () => expect(itemUnitTotal(item)).toBe(3_900));
  it("multiplica pela quantidade", () => expect(cartTotal([item])).toBe(7_800));
  it("soma a quantidade de itens", () => expect(cartQuantity([item])).toBe(2));
  it("calcula a economia da promoção pela quantidade", () => expect(cartSavings([{ ...item, compareAtPrice: 4_500 }])).toBe(2_000));
  it("mantém a loja aberta em qualquer horário durante os testes", () => expect(getStoreClock(new Date("2026-08-19T03:00:00-03:00")).open).toBe(true));
});
