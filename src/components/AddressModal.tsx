import { useState } from "react";
import { CheckCircle2, LocateFixed, MapPin, Navigation, Search, XCircle } from "lucide-react";
import { geocodeAddress } from "../lib/api";
import type { DeliveryAddress } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  onResolved: (address: DeliveryAddress) => void;
};

export function AddressModal({ open, onClose, onResolved }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DeliveryAddress | null>(null);

  if (!open) return null;

  const resolve = async (payload: { query?: string; latitude?: number; longitude?: number }) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await geocodeAddress(payload));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não conseguimos localizar esse endereço.");
    } finally {
      setLoading(false);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Seu navegador não liberou a localização. Digite o CEP ou endereço.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => void resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => {
        setLoading(false);
        setError("Não foi possível acessar sua localização. Digite o CEP ou endereço.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const confirm = () => {
    if (!result) return;
    onResolved(result);
    onClose();
  };

  return (
    <div className="modal-backdrop address-backdrop" role="dialog" aria-modal="true" aria-labelledby="address-title">
      <div className="address-modal">
        <div className="address-brand">
          <img src="/recoba-logo.png" alt="Recoba Burger" />
          <span>Entrega grátis</span>
        </div>
        <div className="address-copy">
          <span className="eyebrow"><Navigation size={14} /> Entregamos em até 3 km</span>
          <h1 id="address-title">Primeiro, onde você quer receber?</h1>
          <p>Digite seu CEP ou endereço para confirmar se a Recoba chega até você.</p>
        </div>

        <form
          className="address-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length >= 5) void resolve({ query: query.trim() });
          }}
        >
          <label htmlFor="delivery-address">CEP ou endereço completo</label>
          <div className="input-with-icon">
            <MapPin size={19} />
            <input
              id="delivery-address"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: 02404-000 ou Rua Voluntários da Pátria, 1200"
              autoFocus
              autoComplete="street-address"
            />
          </div>
          <button className="primary-button" disabled={loading || query.trim().length < 5} type="submit">
            <Search size={18} /> {loading ? "Localizando..." : "Verificar endereço"}
          </button>
          <button className="location-button" disabled={loading} type="button" onClick={useLocation}>
            <LocateFixed size={18} /> Usar minha localização atual
          </button>
        </form>

        {error && <div className="inline-alert error"><XCircle size={18} /><span>{error}</span></div>}

        {result && (
          <div className={`address-result ${result.eligible ? "success" : "outside"}`}>
            {result.eligible ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            <div>
              <strong>{result.eligible ? "Boa, entregamos aí!" : "Esse endereço está fora da área"}</strong>
              <span>{result.normalizedAddress}</span>
              <small>{result.distanceKm.toFixed(1).replace(".", ",")} km da Recoba Burger</small>
            </div>
          </div>
        )}

        {result && (
          <button className="primary-button confirm-address" type="button" onClick={confirm}>
            {result.eligible ? "Usar este endereço" : "Ver cardápio mesmo assim"}
          </button>
        )}

        {!result && <button className="browse-link" type="button" onClick={onClose}>Quero só ver o cardápio</button>}
      </div>
    </div>
  );
}
