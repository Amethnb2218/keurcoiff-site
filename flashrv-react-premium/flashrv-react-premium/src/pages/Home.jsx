import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <section className="container-pad pt-10 pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="badge mb-4">✨ Clair • Minimal • Premium</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink">
              Réserve ton coiffeur en <span className="text-primary">2 minutes</span>.
            </h1>
            <p className="mt-4 text-muted text-lg">
              Découvre les meilleurs salons, choisis un service, une date, et confirme. Une expérience pensée pour le mobile.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/salons" className="btn-primary">Explorer les salons</Link>
              <Link to="/login" className="btn-ghost">Se connecter</Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="card p-4"><div className="text-sm font-bold">Sécurisé</div><div className="text-xs text-muted mt-1">Keycloak + JWT</div></div>
              <div className="card p-4"><div className="text-sm font-bold">Rapide</div><div className="text-xs text-muted mt-1">Flow simple</div></div>
              <div className="card p-4"><div className="text-sm font-bold">Mobile</div><div className="text-xs text-muted mt-1">Responsive</div></div>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="text-sm font-semibold text-muted">Comment ça marche</div>
            <ol className="mt-4 space-y-3">
              <li className="flex gap-3"><div className="h-8 w-8 rounded-xl bg-primary/10 text-primary font-extrabold flex items-center justify-center">1</div><div><div className="font-bold">Choisir un salon</div><div className="text-sm text-muted">Notes, localisation, services.</div></div></li>
              <li className="flex gap-3"><div className="h-8 w-8 rounded-xl bg-primary/10 text-primary font-extrabold flex items-center justify-center">2</div><div><div className="font-bold">Sélectionner un service</div><div className="text-sm text-muted">Prix clair, durée estimée.</div></div></li>
              <li className="flex gap-3"><div className="h-8 w-8 rounded-xl bg-primary/10 text-primary font-extrabold flex items-center justify-center">3</div><div><div className="font-bold">Réserver</div><div className="text-sm text-muted">Confirmation immédiate.</div></div></li>
            </ol>
            <div className="mt-6"><Link to="/salons" className="btn-primary w-full">Démarrer</Link></div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="container-pad py-12">
          <h2 className="text-2xl font-extrabold tracking-tight">Une interface pensée pour l’expérience</h2>
          <p className="text-muted mt-2 max-w-2xl">Design minimal premium, typographie soignée, composants cohérents et mobile-first.</p>
        </div>
      </section>
    </div>
  );
}
