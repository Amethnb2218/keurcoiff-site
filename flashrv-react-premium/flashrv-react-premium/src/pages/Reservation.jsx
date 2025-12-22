import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Toast from "../ui/Toast";
import { api } from "../lib/api";
import Spinner from "../ui/Spinner";

export default function Reservation() {
  const auth = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const salonId = sp.get("salonId") || "";
  const serviceId = sp.get("serviceId") || "";

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const iso = useMemo(() => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00`).toISOString();
  }, [date, time]);

  async function submit(e) {
    e.preventDefault();
    if (!auth.isAuthenticated) return nav("/login");
    if (!salonId || !serviceId) return setToast({ type:"error", message:"Paramètres manquants (salon/service)." });
    if (!iso) return setToast({ type:"error", message:"Choisis date et heure." });

    try {
      setLoading(true);
      const token = auth.user?.access_token;
      await api("/bookings", { method:"POST", token, body:{ salonId, serviceId, datetime: iso } });
      setToast({ type:"success", message:"Réservation créée ✅" });
      setTimeout(()=>nav("/mes-reservations",{replace:true}),700);
    } catch (err) {
      setToast({ type:"error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-pad py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-xl mx-auto card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Réservation</h1>
        <p className="text-muted mt-2">Choisis une date et une heure, puis confirme.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-sm font-semibold">Date</label>
            <input className="input mt-1" type="date" value={date} onChange={(e)=>setDate(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-semibold">Heure</label>
            <input className="input mt-1" type="time" value={time} onChange={(e)=>setTime(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner label="Création..." /> : "Confirmer la réservation"}
          </button>
          <div className="text-xs text-muted">Sécurité: token Keycloak requis. Identifiants incorrects ⇒ login refusé.</div>
        </form>
      </div>
    </div>
  );
}
