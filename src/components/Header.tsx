import { MapPin, ShoppingBag } from "lucide-react";
import type { DeliveryAddress } from "../types";

type Props = {
  address: DeliveryAddress | null;
  cartCount: number;
  cartAnimating: boolean;
  onAddressClick: () => void;
  onCartClick: () => void;
};

export function Header({ address, cartCount, cartAnimating, onAddressClick, onCartClick }: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="header-logo" href="#top" aria-label="Recoba Burger, início">
          <img src="/recoba-logo.png" alt="" />
          <span>RECOBA <small>BURGER</small></span>
        </a>
        <button className="address-pill" type="button" onClick={onAddressClick}>
          <MapPin size={18} />
          <span>
            <small>Entregar em</small>
            <strong>{address ? address.normalizedAddress : "Informar endereço"}</strong>
          </span>
        </button>
        <div className="header-status open">
          <i /> Aberto para pedidos
        </div>
        <button className={`cart-button ${cartAnimating ? "cart-bump" : ""}`} type="button" onClick={onCartClick} aria-label={`Abrir sacola com ${cartCount} itens`}>
          <ShoppingBag size={21} />
          <span>Sacola</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </div>
    </header>
  );
}
