import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Spinner from "../ui/Spinner";
import Toast from "../ui/Toast";
import { api } from "../lib/api";
import { moneyXof } from "../lib/format";

export default function SalonDetail() {
  const { id } = useParams();
  const [toast, setToast] = useState(null);
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await api(`/salons/${id}`);
        setSalon(s?.data || s);
        const sv = await api(`/salons/${id}/services`);
        setServices(sv?.data || sv || []);
      } catch (e) {
        setToast({ type:"error", message:e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="container-pad py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="mb-6"><Link to="/salons" className="text-sm font-semibold text-primary">← Retour</Link></div>

      {loading ? <Spinner/> : !salon ? (
        <div className="card p-6 text-muted">Salon introuvable.</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 card p-6">
            <div className="text-2xl font-extrabold">{salon.name}</div>
            <div className="text-muted mt-2">{salon.address || "—"}</div>
            {salon.rating != null && <div className="mt-4 badge"><span className="text-primary font-extrabold">★</span><span>{Number(salon.rating).toFixed(1)}</span></div>}
            <div className="mt-6 text-sm text-muted">Sélectionne un service pour continuer.</div>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-lg font-extrabold">Services</h2>
              <div className="mt-4 space-y-3">
                {services.length===0 ? <div className="text-muted">Aucun service.</div> : services.map(sv => (
                  <div key={sv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-line rounded-xl p-4">
                    <div>
                      <div className="font-bold">{sv.name}</div>
                      <div className="text-sm text-muted mt-1">{sv.durationMinutes ? `${sv.durationMinutes} min • `:""}{moneyXof(sv.price)}</div>
                    </div>
                    <Link to={`/reservation?salonId=${salon.id}&serviceId=${sv.id}`} className="btn-primary">Réserver</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
