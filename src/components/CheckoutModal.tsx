import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, CreditCard, LoaderCircle, LockKeyhole, MapPin, QrCode, ShieldCheck, X } from "lucide-react";
import { createOrder, getOrderStatus, tokenizeCard } from "../lib/api";
import { captureAttribution, track } from "../lib/analytics";
import { formatCurrency, digitsOnly } from "../lib/store";
import type { CartItem, CustomerForm, DeliveryAddress, PaymentConfig, PaymentResult } from "../types";

type Props = {
  open: boolean;
  items: CartItem[];
  total: number;
  address: DeliveryAddress;
  config: PaymentConfig | null;
  onClose: () => void;
  onPaid: (orderId: string) => void;
};

const emptyCustomer: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  document: "",
  number: "",
  complement: "",
  reference: "",
};

const readCustomer = (): CustomerForm => {
  try {
    const stored = JSON.parse(localStorage.getItem("recoba.customer") || "{}") as Partial<CustomerForm>;
    return { ...emptyCustomer, name: stored.name || "", phone: stored.phone || "", number: stored.number || "", complement: stored.complement || "" };
  } catch {
    return emptyCustomer;
  }
};

export function CheckoutModal({ open, items, total, address, config, onClose, onPaid }: Props) {
  const [customer, setCustomer] = useState<CustomerForm>(readCustomer);
  const [method, setMethod] = useState<"pix" | "credit_card">("pix");
  const [card, setCard] = useState({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const paidRef = useRef(false);
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_CHECKOUT === "true";

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError("");
    paidRef.current = false;
  }, [open]);

  useEffect(() => {
    localStorage.setItem("recoba.customer", JSON.stringify({
      name: customer.name,
      phone: customer.phone,
      number: customer.number,
      complement: customer.complement,
    }));
  }, [customer.name, customer.phone, customer.number, customer.complement]);

  useEffect(() => {
    if (!result || result.method !== "pix" || ["paid", "canceled", "failed"].includes(result.status.toLowerCase())) return;
    const timer = window.setInterval(async () => {
      try {
        const status = await getOrderStatus(result.localOrderId);
        if (status.status.toLowerCase() === "paid") {
          setResult((current) => current ? { ...current, status: "paid" } : current);
          if (!paidRef.current) {
            paidRef.current = true;
            track("Purchase", { value: total / 100, currency: "BRL" });
            onPaid(result.localOrderId);
          }
        }
      } catch {
        // Mantem o QR visivel. O webhook e a proxima consulta reconciliam o status.
      }
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [result, onPaid, total]);

  if (!open) return null;

  const updateCustomer = (field: keyof CustomerForm, value: string) => setCustomer((current) => ({ ...current, [field]: value }));
  const configured = Boolean(config?.paymentsConfigured && config.publicKey);

  const validate = () => {
    if (customer.name.trim().split(/\s+/).length < 2) return "Digite seu nome completo.";
    if (digitsOnly(customer.phone).length < 10) return "Digite um telefone com DDD.";
    if (!customer.number.trim()) return "Digite o número do endereço.";
    if (configured && !/^\S+@\S+\.\S+$/.test(customer.email)) return "Digite um e-mail válido.";
    if (configured && digitsOnly(customer.document).length !== 11) return "Digite um CPF com 11 números.";
    if (method === "credit_card") {
      if (digitsOnly(card.number).length < 13) return "Confira o número do cartão.";
      if (!card.holderName.trim()) return "Digite o nome impresso no cartão.";
      if (!card.expMonth || !card.expYear || digitsOnly(card.cvv).length < 3) return "Confira a validade e o CVV.";
    }
    return "";
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (demoEnabled && !configured) {
        const demoResult: PaymentResult = { localOrderId: `demo-${Date.now()}`, status: "paid", method };
        setResult(demoResult);
        paidRef.current = true;
        onPaid(demoResult.localOrderId);
        return;
      }
      if (!config?.publicKey || !config.paymentsConfigured) throw new Error("A integração de pagamento ainda não foi ativada.");
      let cardToken: string | undefined;
      if (method === "credit_card") {
        const token = await tokenizeCard(config.publicKey, card);
        cardToken = token.id;
        setCard({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "" });
      }
      const order = await createOrder({
        items,
        customer,
        address,
        paymentMethod: method,
        cardToken,
        attribution: captureAttribution(),
      });
      setResult(order);
      if (order.status.toLowerCase() === "paid") {
        paidRef.current = true;
        track("Purchase", { value: total / 100, currency: "BRL" });
        onPaid(order.localOrderId);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível processar o pagamento.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const paid = result.status.toLowerCase() === "paid";
    return (
      <div className="modal-backdrop checkout-backdrop" role="dialog" aria-modal="true">
        <div className="checkout-modal result-modal">
          <button className="modal-close" type="button" onClick={onClose}><X /></button>
          {paid ? (
            <div className="payment-success">
              <span className="success-icon"><CheckCircle2 /></span>
              <span className="eyebrow">Pagamento aprovado</span>
              <h2>Pedido recebido!</h2>
              <p>Já enviamos seu pedido para a Recoba Burger. Guarde o código abaixo para acompanhar.</p>
              <strong className="order-code">{result.localOrderId}</strong>
              <button className="primary-button" type="button" onClick={onClose}>Voltar ao cardápio</button>
            </div>
          ) : (
            <div className="pix-result">
              <span className="pix-icon"><QrCode /></span>
              <span className="eyebrow">Pix gerado</span>
              <h2>Escaneie e pague</h2>
              <p>O pedido só vai para a cozinha depois da confirmação do pagamento.</p>
              {result.qrCodeUrl && <img className="qr-image" src={result.qrCodeUrl} alt="QR Code Pix" />}
              {result.qrCode && (
                <button
                  className="pix-copy"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(result.qrCode || "");
                    setCopied(true);
                  }}
                >
                  <span>{result.qrCode}</span><Copy size={17} />
                </button>
              )}
              <small>{copied ? "Código Pix copiado" : "Pague em até 15 minutos"}</small>
              <div className="payment-waiting"><LoaderCircle className="spin" size={18} /> Aguardando confirmação...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop checkout-backdrop" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div className="checkout-modal">
        <div className="checkout-header"><div><span>Rápido e seguro</span><h2 id="checkout-title">Cadastro e pagamento</h2></div><button type="button" onClick={onClose}><X /></button></div>
        <form onSubmit={submit}>
          <div className="checkout-scroll">
            <section className="checkout-section">
              <h3>Cadastro rápido</h3>
              <div className="form-grid">
                <label className="full">Nome completo<input value={customer.name} onChange={(e) => updateCustomer("name", e.target.value)} autoComplete="name" placeholder="Como podemos te chamar?" /></label>
                <label className="full">Celular com DDD<input value={customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
              </div>
            </section>

            <section className="checkout-section delivery-section">
              <div className="section-title"><h3>Endereço de entrega</h3><span><MapPin size={14} /> {address.distanceKm.toFixed(1).replace(".", ",")} km</span></div>
              <p className="confirmed-address"><strong>{address.street || address.normalizedAddress}</strong><span>{address.normalizedAddress}</span></p>
              <div className="form-grid">
                <label>Número<input value={customer.number} onChange={(e) => updateCustomer("number", e.target.value)} autoComplete="address-line2" /></label>
                <label>Complemento<input value={customer.complement} onChange={(e) => updateCustomer("complement", e.target.value)} placeholder="Apto, bloco..." /></label>
              </div>
            </section>

            <section className="checkout-section">
              <h3>Como você quer pagar?</h3>
              {configured ? (
                <div className="stone-required-fields form-grid">
                  <p>A Stone solicita estes dois dados para gerar o pagamento.</p>
                  <label className="full">E-mail<input type="email" value={customer.email} onChange={(e) => updateCustomer("email", e.target.value)} autoComplete="email" placeholder="voce@email.com" /></label>
                  <label className="full">CPF<input value={customer.document} onChange={(e) => updateCustomer("document", e.target.value)} inputMode="numeric" placeholder="000.000.000-00" /></label>
                </div>
              ) : null}
              <div className="payment-tabs">
                <button type="button" className={method === "pix" ? "active" : ""} onClick={() => setMethod("pix")}><QrCode /> <span><strong>Pix</strong><small>Aprovação imediata</small></span></button>
                <button type="button" className={method === "credit_card" ? "active" : ""} onClick={() => setMethod("credit_card")}><CreditCard /> <span><strong>Cartão</strong><small>Crédito à vista</small></span></button>
              </div>

              {method === "pix" ? (
                <div className="pix-info"><QrCode /><div><strong>Pix copia e cola</strong><p>Você recebe o QR Code na próxima tela. O pedido é confirmado assim que o pagamento for aprovado.</p></div></div>
              ) : (
                <div className="card-fields form-grid">
                  <label className="full">Número do cartão<input value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" data-pagarmecheckout-element="number" /></label>
                  <label className="full">Nome no cartão<input value={card.holderName} onChange={(e) => setCard((c) => ({ ...c, holderName: e.target.value }))} autoComplete="cc-name" data-pagarmecheckout-element="holder_name" /></label>
                  <label>Mês<input value={card.expMonth} onChange={(e) => setCard((c) => ({ ...c, expMonth: e.target.value }))} inputMode="numeric" autoComplete="cc-exp-month" placeholder="MM" data-pagarmecheckout-element="exp_month" /></label>
                  <label>Ano<input value={card.expYear} onChange={(e) => setCard((c) => ({ ...c, expYear: e.target.value }))} inputMode="numeric" autoComplete="cc-exp-year" placeholder="AAAA" data-pagarmecheckout-element="exp_year" /></label>
                  <label>CVV<input value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))} inputMode="numeric" autoComplete="cc-csc" placeholder="123" data-pagarmecheckout-element="cvv" /></label>
                </div>
              )}
            </section>

            {!configured && !demoEnabled && (
              <div className="inline-alert warning"><LockKeyhole size={18} /><span>A integração Stone ainda precisa das chaves da conta para liberar pagamentos.</span></div>
            )}
            {error && <div className="inline-alert error"><X size={18} /><span>{error}</span></div>}
            <div className="secure-note"><ShieldCheck size={17} /><span>Os dados do cartão vão direto para a Stone/Pagar.me e nunca passam pelo servidor da Recoba.</span></div>
          </div>

          <div className="checkout-footer">
            <div><span>Total</span><strong>{formatCurrency(total)}</strong><small>Entrega grátis</small></div>
            <button className="primary-button" type="submit" disabled={loading || (!configured && !demoEnabled)}>
              {loading ? <><LoaderCircle className="spin" size={18} /> Processando...</> : method === "pix" ? "Gerar Pix e pedir" : "Pagar e fazer pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
