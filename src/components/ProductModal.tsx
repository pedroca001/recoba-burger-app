import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatCurrency } from "../lib/store";
import type { CartItem, MenuProduct, SelectedOption } from "../types";

type Props = {
  product: MenuProduct | null;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
};

export function ProductModal({ product, onClose, onAdd }: Props) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    setSelected({});
    setQuantity(1);
    setNote("");
    setShowErrors(false);
  }, [product?.id]);

  const selectedOptions = useMemo<SelectedOption[]>(() => {
    if (!product) return [];
    return product.groups.flatMap((group) =>
      group.options
        .filter((option) => selected[group.id]?.includes(option.id))
        .map((option) => ({ ...option, groupId: group.id, groupName: group.name })),
    );
  }, [product, selected]);

  if (!product) return null;

  const unitTotal = product.price + selectedOptions.reduce((sum, option) => sum + option.price, 0);
  const valid = product.groups.every((group) => (selected[group.id]?.length || 0) >= group.minimum);
  const unavailable = product.price === 0 && product.groups.length === 0;

  const toggle = (groupId: string, optionId: string, maximum: number) => {
    setSelected((current) => {
      const values = current[groupId] || [];
      if (values.includes(optionId)) return { ...current, [groupId]: values.filter((id) => id !== optionId) };
      if (maximum === 1) return { ...current, [groupId]: [optionId] };
      if (values.length >= maximum) return current;
      return { ...current, [groupId]: [...values, optionId] };
    });
  };

  const add = () => {
    if (!valid) {
      setShowErrors(true);
      document.querySelector(".choice-group.invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAdd({
      lineId: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: product.price,
      quantity,
      options: selectedOptions,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop product-backdrop" role="dialog" aria-modal="true" aria-labelledby="product-title">
      <div className="product-modal">
        <button className="mobile-back" type="button" onClick={onClose} aria-label="Voltar"><ChevronLeft /></button>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar"><X /></button>
        <div className="product-modal-scroll">
          <div className="product-hero">
            {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-placeholder"><img src="/recoba-logo.png" alt="" /></div>}
          </div>
          <div className="product-modal-content">
            <span className="eyebrow">Recoba Burger</span>
            <h2 id="product-title">{product.name}</h2>
            {product.description && <p>{product.description}</p>}
            <strong className="product-base-price">{product.price > 0 ? formatCurrency(product.price) : "Item de composição"}</strong>
          </div>

          {product.groups.map((group) => {
            const count = selected[group.id]?.length || 0;
            const invalid = showErrors && count < group.minimum;
            return (
              <section className={`choice-group ${invalid ? "invalid" : ""}`} key={group.id}>
                <div className="choice-heading">
                  <div><h3>{group.name}</h3><span>{group.minimum > 0 ? `Escolha ${group.minimum}` : `Escolha até ${group.maximum}`}</span></div>
                  {group.minimum > 0 && <b>Obrigatório</b>}
                </div>
                {group.options.map((option) => {
                  const checked = selected[group.id]?.includes(option.id) || false;
                  return (
                    <button
                      className={`choice-option ${checked ? "selected" : ""}`}
                      type="button"
                      key={option.id}
                      onClick={() => toggle(group.id, option.id, group.maximum)}
                    >
                      <span className={group.maximum === 1 ? "radio" : "checkbox"}>{checked && <Check size={14} />}</span>
                      <span className="choice-copy"><strong>{option.name}</strong>{option.description && <small>{option.description}</small>}</span>
                      <span className="choice-price">{option.price > 0 ? `+ ${formatCurrency(option.price)}` : "Grátis"}</span>
                    </button>
                  );
                })}
                {invalid && <p className="field-error">Selecione {group.minimum} {group.minimum === 1 ? "opção" : "opções"} para continuar.</p>}
              </section>
            );
          })}

          {!unavailable && (
            <div className="note-block">
              <label htmlFor="product-note">Alguma observação?</label>
              <textarea id="product-note" maxLength={180} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: tirar cebola, ponto da carne..." />
              <small>{note.length}/180</small>
            </div>
          )}
        </div>

        <div className="product-modal-footer">
          {unavailable ? (
            <button className="primary-button" disabled type="button">Indisponível para pedido avulso</button>
          ) : (
            <>
              <div className="quantity-control">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={17} /></button>
                <b>{quantity}</b>
                <button type="button" onClick={() => setQuantity(quantity + 1)}><Plus size={17} /></button>
              </div>
              <button className="primary-button add-button" type="button" onClick={add}>
                <ShoppingBag size={18} /> Adicionar <span>{formatCurrency(unitTotal * quantity)}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
