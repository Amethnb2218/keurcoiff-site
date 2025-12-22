import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Spinner from "../ui/Spinner";

export default function AuthCallback() {
  const auth = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (auth.isAuthenticated) nav("/salons", { replace:true }); }, [auth.isAuthenticated, nav]);
  return <div className="container-pad py-10"><Spinner label="Connexion en cours..." /></div>;
}
