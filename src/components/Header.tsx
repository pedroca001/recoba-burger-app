import { MapPin, ShoppingBag } from "lucide-react";
import type { DeliveryAddress } from "../types";
import type { StoreClock } from "../lib/hours";

type Props = {
  address: DeliveryAddress | null;
  clock: StoreClock;
  cartCount: number;
  onAddressClick: () => void;
  onCartClick: () => void;
};

export function Header({ address, clock, cartCount, onAddressClick, onCartClick }: Props) {
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
        <div className={`header-status ${clock.open ? "open" : "closed"}`}>
          <i /> {clock.label}
        </div>
        <button className="cart-button" type="button" onClick={onCartClick} aria-label={`Abrir sacola com ${cartCount} itens`}>
          <ShoppingBag size={21} />
          <span>Sacola</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </div>
    </header>
  );
}
