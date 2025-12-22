import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import Spinner from "../ui/Spinner";
import Toast from "../ui/Toast";
import { api } from "../lib/api";
import { dtHuman, moneyXof } from "../lib/format";

export default function MyBookings() {
  const auth = useAuth();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = auth.user?.access_token;
        const res = await api("/bookings/me", { token });
        setItems(res?.data || res || []);
      } catch (e) {
        setToast({ type:"error", message:e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.user?.access_token]);

  return (
    <div className="container-pad py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="text-3xl font-extrabold tracking-tight">Mes réservations</h1>
      <p className="text-muted mt-1">Historique et statut.</p>

      <div className="mt-6">
        {loading ? <Spinner/> : items.length===0 ? (
          <div className="card p-6 text-muted">Aucune réservation.</div>
        ) : (
          <div className="space-y-3">
            {items.map(b => (
              <div key={b.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold">{b.salonName} • {b.serviceName}</div>
                  <div className="text-sm text-muted mt-1">{dtHuman(b.datetime)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge">{b.status}</span>
                  <span className="text-sm font-extrabold">{moneyXof(b.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
