export const CAROUSEL_CATEGORY_IDS = new Set([
  "burger-batata-coca",
  "os-mais-vendidos-do-recoba",
]);

// Soma dos equivalentes avulsos existentes no cardapio: burger + batata individual + refrigerante.
export const PROMOTION_COMPARE_AT: Record<string, number> = {
  "353": 6_370,
  "352": 6_170,
  "351": 5_770,
  "350": 7_570,
};

export const getCompareAtPrice = (productId: string) => PROMOTION_COMPARE_AT[productId];
