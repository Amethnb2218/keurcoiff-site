import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import Spinner from "../ui/Spinner";
import Toast from "../ui/Toast";
import { api } from "../lib/api";

export default function Profile() {
  const auth = useAuth();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = auth.user?.access_token;
        const res = await api("/me", { token });
        setProfile(res?.data || res);
      } catch (e) {
        setToast({ type:"error", message:e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.user?.access_token]);

  const p = auth.user?.profile;

  return (
    <div className="container-pad py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="text-3xl font-extrabold tracking-tight">Profil</h1>
      <p className="text-muted mt-1">Compte (Keycloak) + profil métier (DB).</p>

      {loading ? <div className="mt-6"><Spinner/></div> : (
        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="text-sm font-semibold text-muted">Compte (Keycloak)</div>
            <div className="mt-3 space-y-2 text-sm">
              <div><span className="text-muted">Téléphone/Username:</span> <b>{p?.preferred_username || "—"}</b></div>
              <div><span className="text-muted">Email:</span> <b>{p?.email || "—"}</b></div>
              <div><span className="text-muted">Nom:</span> <b>{p?.name || p?.given_name || "—"}</b></div>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm font-semibold text-muted">Profil FlashRV</div>
            <div className="mt-3 space-y-2 text-sm">
              <div><span className="text-muted">Id:</span> <b>{profile?.id || "—"}</b></div>
              <div><span className="text-muted">Rôle:</span> <b>{profile?.role || "client"}</b></div>
              <div><span className="text-muted">Créé:</span> <b>{profile?.createdAt ? new Date(profile.createdAt).toLocaleString("fr-FR") : "—"}</b></div>
            </div>
            <div className="mt-4 text-xs text-muted">Ce profil est créé automatiquement au 1er appel API après login.</div>
          </div>
        </div>
      )}
    </div>
  );
}
