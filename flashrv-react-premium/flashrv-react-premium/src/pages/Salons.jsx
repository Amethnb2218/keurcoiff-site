import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../ui/Spinner";
import Toast from "../ui/Toast";
import { api } from "../lib/api";

export default function Salons() {
  const [toast, setToast] = useState(null);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try { setLoading(true); const res = await api("/salons"); setSalons(res?.data || res || []); }
      catch (e) { setToast({ type:"error", message:e.message }); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return salons;
    return salons.filter(x => (x.name||"").toLowerCase().includes(s) || (x.address||"").toLowerCase().includes(s));
  }, [salons, q]);

  return (
    <div className="container-pad py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Salons</h1>
          <p className="text-muted mt-1">Choisis un salon et réserve un service.</p>
        </div>
        <div className="w-full sm:w-96">
          <input className="input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Rechercher (nom, adresse)..." />
        </div>
      </div>

      {loading ? <Spinner/> : filtered.length===0 ? (
        <div className="card p-6 text-muted">Aucun salon.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(s => (
            <Link key={s.id} to={`/salons/${s.id}`} className="card p-6 hover:border-primary transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">{s.name}</div>
                  <div className="text-sm text-muted mt-1">{s.address || "—"}</div>
                </div>
                {s.rating != null && <div className="badge"><span className="text-primary font-extrabold">★</span><span>{Number(s.rating).toFixed(1)}</span></div>}
              </div>
              <div className="mt-6"><span className="btn-primary w-full">Voir les services</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
