import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Spinner from "./Spinner";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  if (auth.isLoading) return <div className="container-pad py-10"><Spinner /></div>;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
