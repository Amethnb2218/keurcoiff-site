import { useAuth } from "react-oidc-context";
import Spinner from "../ui/Spinner";

export default function Login() {
  const auth = useAuth();
  return (
    <div className="container-pad py-10">
      <div className="max-w-lg mx-auto card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Connexion</h1>
        <p className="text-muted mt-2">Connecte-toi avec <b>téléphone (username)</b> ou <b>email</b> via Keycloak.</p>
        <div className="mt-6">
          {auth.isLoading ? <Spinner label="Préparation..." /> : (
            <button className="btn-primary w-full" onClick={() => auth.signinRedirect()}>
              Se connecter / S’inscrire
            </button>
          )}
        </div>
        <div className="mt-4 text-sm text-muted">Inscription activée dans Keycloak (Register).</div>
      </div>
    </div>
  );
}
