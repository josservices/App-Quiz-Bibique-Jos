interface ResultViewProps {
  total: number;
  correct: number;
  incorrect: number;
  bestScore: number;
  onRestart: () => void;
  onBackToBooks: () => void;
}

function scoreColor(percent: number): string {
  if (percent > 70) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (percent >= 50) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-rose-600 dark:text-rose-400';
}

export function ResultView({
  total,
  correct,
  incorrect,
  bestScore,
  onRestart,
  onBackToBooks
}: ResultViewProps) {
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
      <h2 className="text-3xl font-black text-slate-900 dark:text-white">Résultats finaux</h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Bonnes réponses
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correct}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Mauvaises réponses
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{incorrect}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Meilleur score
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{bestScore}%</p>
        </div>
      </div>

      <p className={`mt-6 text-3xl font-black ${scoreColor(percent)}`}>Score final: {percent}%</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={onRestart}
          className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
        >
          Recommencer
        </button>
        <button
          onClick={onBackToBooks}
          className="rounded-2xl border border-slate-300 bg-white/70 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Retour aux livres
        </button>
      </div>
    </section>
  );
}
