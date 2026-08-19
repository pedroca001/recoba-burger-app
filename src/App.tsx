import { useEffect, useMemo, useRef, useState } from "react";
import { Bike, CheckCircle2, ChevronRight, Clock3, MapPin, Search, ShoppingBag, Star, X } from "lucide-react";
import menuData from "./data/menu.json";
import { AddressModal } from "./components/AddressModal";
import { CartDrawer } from "./components/CartDrawer";
import { CheckoutModal } from "./components/CheckoutModal";
import { Header } from "./components/Header";
import { ProductModal } from "./components/ProductModal";
import { PromotionCarousel } from "./components/PromotionCarousel";
import { getPaymentConfig } from "./lib/api";
import { captureAttribution, initAnalytics, track } from "./lib/analytics";
import { cartQuantity, cartTotal } from "./lib/cart";
import { formatCurrency, STORE } from "./lib/store";
import type { CartItem, DeliveryAddress, MenuCatalog, MenuProduct, PaymentConfig } from "./types";

const catalog = menuData as MenuCatalog;
const categoryPriority = ["burger-batata-coca", "os-mais-vendidos-do-recoba"];
const orderedCategories = [...catalog.categories].sort((left, right) => {
  const leftIndex = categoryPriority.indexOf(left.id);
  const rightIndex = categoryPriority.indexOf(right.id);
  return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
});

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [address, setAddress] = useState<DeliveryAddress | null>(() => readStored("recoba.deliveryAddress", null));
  const [addressOpen, setAddressOpen] = useState(() => !readStored("recoba.deliveryAddress", null));
  const [cart, setCart] = useState<CartItem[]>(() => readStored("recoba.cart", []));
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [search, setSearch] = useState("");
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [cartAnimating, setCartAnimating] = useState(false);
  const [addedItem, setAddedItem] = useState("");
  const animationTimer = useRef<number | null>(null);

  const total = useMemo(() => cartTotal(cart), [cart]);
  const count = useMemo(() => cartQuantity(cart), [cart]);

  useEffect(() => {
    initAnalytics();
    captureAttribution();
    void getPaymentConfig().then(setPaymentConfig).catch(() => setPaymentConfig(null));
    return () => {
      if (animationTimer.current) window.clearTimeout(animationTimer.current);
    };
  }, []);

  useEffect(() => localStorage.setItem("recoba.cart", JSON.stringify(cart)), [cart]);
  useEffect(() => {
    if (address) localStorage.setItem("recoba.deliveryAddress", JSON.stringify(address));
  }, [address]);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return orderedCategories;
    return orderedCategories
      .map((category) => ({
        ...category,
        products: category.products.filter((product) =>
          `${product.name} ${product.description}`.toLocaleLowerCase("pt-BR").includes(query),
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [search]);

  const addToCart = (item: CartItem) => {
    setCart((current) => [...current, item]);
    setAddedItem(item.name);
    setCartAnimating(false);
    window.requestAnimationFrame(() => setCartAnimating(true));
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    animationTimer.current = window.setTimeout(() => {
      setCartAnimating(false);
      setAddedItem("");
    }, 1_100);
    track("AddToCart", {
      content_ids: [item.productId],
      content_name: item.name,
      content_type: "product",
      value: (item.basePrice + item.options.reduce((sum, option) => sum + option.price, 0)) * item.quantity / 100,
      currency: "BRL",
    });
  };

  const openProduct = (product: MenuProduct) => {
    setSelectedProduct(product);
    track("ViewContent", { content_ids: [product.id], content_name: product.name, content_type: "product", value: product.price / 100, currency: "BRL" });
  };

  const startCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
    track("InitiateCheckout", { value: total / 100, currency: "BRL", num_items: count });
  };

  const primaryHeroProduct = orderedCategories[0]?.products[0];

  return (
    <div className="app-shell" id="top">
      <Header address={address} cartCount={count} cartAnimating={cartAnimating} onAddressClick={() => setAddressOpen(true)} onCartClick={() => setCartOpen(true)} />

      <main>
        <section className="restaurant-hero">
          <div className="hero-visual">
            <div className="hero-logo-wrap"><img src="/recoba-logo.png" alt="Recoba Burger" /></div>
            {primaryHeroProduct?.image && <img className="hero-burger" src={primaryHeroProduct.image} alt="" />}
            <div className="hero-glow" />
          </div>
          <div className="restaurant-info">
            <div className="restaurant-title-row">
              <div>
                <span className="eyebrow">Hamburgueria artesanal em Santana</span>
                <h1>Recoba Burger</h1>
                <p>Sua nova hamburgueria preferida.</p>
              </div>
              <button className="info-address" type="button" onClick={() => setAddressOpen(true)}><MapPin size={18} /><span>{address?.eligible ? "Entregamos no seu endereço" : "Confira a área de entrega"}</span><ChevronRight size={17} /></button>
            </div>
            <div className="restaurant-metrics">
              <span className="rating"><Star size={15} fill="currentColor" /> 4,82</span>
              <span><Bike size={16} /> Entrega grátis</span>
              <span><Clock3 size={16} /> 25 a 40 min</span>
              <span>Pedido mín. {formatCurrency(STORE.minimumOrder)}</span>
            </div>
          </div>
        </section>

        {address && !address.eligible && (
          <div className="outside-banner"><MapPin size={20} /><div><strong>Endereço fora do raio de 3 km</strong><span>Você pode navegar pelo cardápio, mas precisa de outro endereço para pedir.</span></div><button type="button" onClick={() => setAddressOpen(true)}>Trocar endereço</button></div>
        )}

        <div className="catalog-shell">
          <div className="catalog-tools">
            <div className="menu-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no cardápio" aria-label="Buscar no cardápio" />{search && <button type="button" onClick={() => setSearch("")}><X size={17} /></button>}</div>
            {!search && (
              <nav className="category-nav" aria-label="Categorias do cardápio">
                {orderedCategories.map((category) => <a key={category.id} href={`#${category.id}`}>{category.name}</a>)}
              </nav>
            )}
          </div>

          <div className="menu-content">
            {visibleCategories.length === 0 ? (
              <div className="empty-search"><Search size={38} /><h2>Nenhum item encontrado</h2><p>Tente buscar por burger, batata, shake ou bebida.</p><button type="button" onClick={() => setSearch("")}>Limpar busca</button></div>
            ) : visibleCategories.map((category) => (
              <section className="menu-category" id={category.id} key={category.id}>
                <div className="category-heading"><div><h2>{category.name}</h2></div>{category.id === "burger-batata-coca" && !search ? <span>Promoções</span> : null}</div>
                {!search && ["burger-batata-coca", "os-mais-vendidos-do-recoba"].includes(category.id) ? (
                  <PromotionCarousel category={category} deals={category.id === "burger-batata-coca"} onSelect={openProduct} />
                ) : (
                  <div className="product-grid">
                    {category.products.map((product) => (
                    <button
                      className="product-card"
                      type="button"
                      key={product.id}
                      onClick={() => openProduct(product)}
                    >
                      <span className="product-card-copy">
                        <strong>{product.name}</strong>
                        {product.description && <small>{product.description}</small>}
                        <b>{product.price > 0 ? formatCurrency(product.price) : "Ver opções"}</b>
                      </span>
                      <span className="product-card-image">
                        {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span><img src="/recoba-logo.png" alt="" /></span>}
                        <i>+</i>
                      </span>
                    </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div><img src="/recoba-logo.png" alt="Recoba Burger" /><div><strong>Recoba Burger</strong><span>Rua Pedro Doll, 259 - Santana</span></div></div>
        <div><span>Aberto para pedidos durante os testes</span><span>Entrega grátis em até 3 km</span><span>Pagamento seguro com Stone</span></div>
        <p>© {new Date().getFullYear()} Recoba Burger. Todos os direitos reservados.</p>
      </footer>

      {count > 0 && !cartOpen && (
        <button className={`mobile-cart-bar ${cartAnimating ? "cart-bump" : ""}`} type="button" onClick={() => setCartOpen(true)}><span><ShoppingBag size={19} /><b>{count}</b></span><strong>Ver sacola</strong><b>{formatCurrency(total)}</b></button>
      )}

      {addedItem ? <div className="cart-toast" role="status"><CheckCircle2 size={21} /><span><b>Adicionado à sacola</b><small>{addedItem}</small></span></div> : null}

      <AddressModal open={addressOpen} onClose={() => setAddressOpen(false)} onResolved={setAddress} />
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
      <CartDrawer
        open={cartOpen}
        items={cart}
        total={total}
        minimum={STORE.minimumOrder}
        address={address}
        onClose={() => setCartOpen(false)}
        onQuantity={(lineId, quantity) => setCart((current) => current.map((item) => item.lineId === lineId ? { ...item, quantity } : item))}
        onRemove={(lineId) => setCart((current) => current.filter((item) => item.lineId !== lineId))}
        onCheckout={startCheckout}
        onAddress={() => { setCartOpen(false); setAddressOpen(true); }}
      />
      {address && (
        <CheckoutModal
          open={checkoutOpen}
          items={cart}
          total={total}
          address={address}
          config={paymentConfig}
          onClose={() => setCheckoutOpen(false)}
          onPaid={() => setCart([])}
        />
      )}
    </div>
  );
}
