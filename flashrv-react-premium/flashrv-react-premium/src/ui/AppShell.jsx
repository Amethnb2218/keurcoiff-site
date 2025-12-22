import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";

function Logo(){ return <span className="font-extrabold tracking-tight">Flash<span className="text-primary">RV'</span></span>; }

function NavItem({ to, children }) {
  return (
    <NavLink to={to} className={({isActive})=>`text-sm font-semibold px-3 py-2 rounded-xl transition ${isActive?"bg-primary/10 text-primary":"text-ink/80 hover:bg-black/5"}`}>
      {children}
    </NavLink>
  );
}

export default function AppShell() {
  const auth = useAuth();
  const user = auth.user?.profile;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-line">
        <div className="container-pad py-3 flex items-center justify-between gap-3">
          <Link to="/" className="text-lg"><Logo/></Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/">Accueil</NavItem>
            <NavItem to="/salons">Salons</NavItem>
            <NavItem to="/mes-reservations">Mes réservations</NavItem>
            <NavItem to="/profile">Profil</NavItem>
          </nav>

          <div className="flex items-center gap-2">
            {!auth.isAuthenticated ? (
              <Link to="/login" className="btn-primary">Se connecter</Link>
            ) : (
              <>
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="text-xs text-muted">Connecté</span>
                  <span className="text-sm font-semibold">{user?.preferred_username || user?.email}</span>
                </div>
                <button className="btn-ghost" onClick={() => auth.signoutRedirect()}>Déconnexion</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pb-16">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="container-pad py-8 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          <div className="text-sm text-muted">© {new Date().getFullYear()} FlashRV' — Premium</div>
          <div className="text-sm text-muted">Hackathon-ready • Responsive • Secure</div>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-3 left-0 right-0 z-40">
        <div className="container-pad">
          <div className="bg-white border border-line rounded-xl3 shadow-soft px-2 py-2 flex justify-between">
            <NavLink to="/" className="btn-ghost flex-1">Accueil</NavLink>
            <NavLink to="/salons" className="btn-ghost flex-1">Salons</NavLink>
            <NavLink to="/mes-reservations" className="btn-ghost flex-1">Réserv.</NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
}
