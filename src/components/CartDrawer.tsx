import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatCurrency } from "../lib/store";
import { itemTotal } from "../lib/cart";
import type { CartItem, DeliveryAddress } from "../types";
import type { StoreClock } from "../lib/hours";

type Props = {
  open: boolean;
  items: CartItem[];
  total: number;
  minimum: number;
  clock: StoreClock;
  address: DeliveryAddress | null;
  onClose: () => void;
  onQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onCheckout: () => void;
  onAddress: () => void;
};

export function CartDrawer({ open, items, total, minimum, clock, address, onClose, onQuantity, onRemove, onCheckout, onAddress }: Props) {
  if (!open) return null;
  const missing = Math.max(0, minimum - total);
  const checkoutBlocked = items.length === 0 || missing > 0 || !clock.open || !address?.eligible;

  const blockMessage = !clock.open
    ? "Pedidos disponíveis todos os dias das 17h às 23h"
    : !address?.eligible
      ? "Confirme um endereço dentro da área de entrega"
      : missing > 0
        ? `Faltam ${formatCurrency(missing)} para o pedido mínimo`
        : "";

  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-labelledby="cart-title" onMouseDown={onClose}>
      <aside className="cart-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header"><div><span>Sua sacola</span><h2 id="cart-title">Recoba Burger</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X /></button></div>
        <div className="drawer-address"><span>Entregar em</span><button type="button" onClick={onAddress}>{address?.normalizedAddress || "Informar endereço"}</button></div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-cart"><ShoppingBag size={42} /><h3>Sua sacola está vazia</h3><p>Escolha seus favoritos no cardápio.</p><button className="primary-button" type="button" onClick={onClose}>Ver cardápio</button></div>
          ) : items.map((item) => (
            <article className="cart-line" key={item.lineId}>
              {item.image ? <img src={item.image} alt="" /> : <div className="cart-line-placeholder" />}
              <div className="cart-line-copy">
                <div><h3>{item.name}</h3><strong>{formatCurrency(itemTotal(item))}</strong></div>
                {item.options.length > 0 && <p>{item.options.map((option) => option.name).join(", ")}</p>}
                {item.note && <small>Obs.: {item.note}</small>}
                <div className="cart-line-actions">
                  <div className="quantity-control small">
                    <button type="button" onClick={() => item.quantity === 1 ? onRemove(item.lineId) : onQuantity(item.lineId, item.quantity - 1)}>{item.quantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}</button>
                    <b>{item.quantity}</b>
                    <button type="button" onClick={() => onQuantity(item.lineId, item.quantity + 1)}><Plus size={15} /></button>
                  </div>
                  <button className="remove-link" type="button" onClick={() => onRemove(item.lineId)}>Remover</button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {items.length > 0 && (
          <div className="cart-summary">
            <div><span>Subtotal</span><strong>{formatCurrency(total)}</strong></div>
            <div><span>Entrega</span><strong className="free">Grátis</strong></div>
            <div className="cart-total"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
            {missing > 0 && <div className="minimum-progress"><div><i style={{ width: `${Math.min(100, (total / minimum) * 100)}%` }} /></div><span>{blockMessage}</span></div>}
            {checkoutBlocked && missing === 0 && <p className="checkout-block-message">{blockMessage}</p>}
            <button className="primary-button checkout-button" disabled={checkoutBlocked} type="button" onClick={onCheckout}>Ir para pagamento <span>{formatCurrency(total)}</span></button>
          </div>
        )}
      </aside>
    </div>
  );
}
