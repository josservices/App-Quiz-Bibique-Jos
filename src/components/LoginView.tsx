import { FormEvent, useState } from 'react';

interface LoginViewProps {
  isChecking: boolean;
  isSimpleAuth: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onLogin: () => void;
  onSimpleLogin: (credentials: { username: string; password: string }) => void;
}

export function LoginView({
  isChecking,
  isSimpleAuth,
  isSubmitting,
  errorMessage,
  onLogin,
  onSimpleLogin
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSimpleLogin({ username, password });
  };

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
      <p className="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
        Accès protégé
      </p>
      <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">Connexion</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Entrez l'identifiant et le mot de passe fournis par l'administrateur.</p>

      {isSimpleAuth ? (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="simple-login-username" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Identifiant
            </label>
            <input
              id="simple-login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="simple-login-password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Mot de passe
            </label>
            <input
              id="simple-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Vérification...' : 'Se connecter'}
          </button>
        </form>
      ) : isChecking ? (
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
