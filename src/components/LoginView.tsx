interface LoginViewProps {
  isChecking: boolean;
  onLogin: () => void;
}

export function LoginView({ isChecking, onLogin }: LoginViewProps) {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
      <p className="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
        Accès protégé
      </p>
      <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">Connexion requise</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Cette application est réservée aux utilisateurs invités.
      </p>

      {isChecking ? (
        <p className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Vérification de la configuration Netlify Identity...
        </p>
      ) : (
        <button
          onClick={onLogin}
          className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
        >
          Se connecter
        </button>
      )}
    </section>
  );
}
