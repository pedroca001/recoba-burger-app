import { BadgePercent, ChevronRight, Flame } from "lucide-react";
import { formatCurrency } from "../lib/store";
import { getCompareAtPrice } from "../lib/promotions";
import type { MenuCategory, MenuProduct } from "../types";

type Props = {
  category: MenuCategory;
  deals: boolean;
  onSelect: (product: MenuProduct) => void;
};

export function PromotionCarousel({ category, deals, onSelect }: Props) {
  return (
    <div className={`promotion-carousel ${deals ? "deal-carousel" : "popular-carousel"}`} aria-label={`${category.name}, deslize para ver mais`}>
      {category.products.map((product) => {
        const compareAtPrice = getCompareAtPrice(product.id);
        const savings = Math.max(0, (compareAtPrice || 0) - product.price);
        return (
          <button className="promotion-card" type="button" key={product.id} onClick={() => onSelect(product)}>
            <span className="promotion-image">
              {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span><img src="/recoba-logo.png" alt="" /></span>}
              <i>{deals ? <BadgePercent size={14} /> : <Flame size={14} />} {deals ? "Oferta" : "Mais pedido"}</i>
            </span>
            <span className="promotion-copy">
              <strong>{product.name}</strong>
              {product.description && <small>{product.description}</small>}
              <span className="promotion-price">
                <span>
                  {compareAtPrice && savings > 0 ? <del>{formatCurrency(compareAtPrice)}</del> : null}
                  <b>{product.price > 0 ? formatCurrency(product.price) : "Ver opções"}</b>
                </span>
                <i><ChevronRight size={18} /></i>
              </span>
              {savings > 0 ? <em>Economize {formatCurrency(savings)}</em> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
