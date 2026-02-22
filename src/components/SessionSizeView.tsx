import type { QuizBook } from '../lib/quizEngine';
import type { SessionSizePreference } from '../lib/storage';

interface SessionSizeViewProps {
  book: QuizBook;
  options: SessionSizePreference[];
  selected: SessionSizePreference;
  isLoadingPool: boolean;
  isPreparing: boolean;
  poolError: string | null;
  loadingLabel?: string | null;
  loadingProgress?: { current: number; total: number } | null;
  onSelect: (size: SessionSizePreference) => void;
  onStart: () => void;
  onBack: () => void;
  onCancelLoading?: () => void;
}

function labelForSize(size: SessionSizePreference): string {
  return size === 'all' ? 'Toutes les questions' : `${size} questions`;
}

export function SessionSizeView({
  book,
  options,
  selected,
  isLoadingPool,
  isPreparing,
  poolError,
  loadingLabel,
  loadingProgress,
  onSelect,
  onStart,
  onBack,
  onCancelLoading
}: SessionSizeViewProps) {
  const progressPercent =
    loadingProgress && loadingProgress.total > 0
      ? Math.round((loadingProgress.current / loadingProgress.total) * 100)
      : 0;

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        Choix de session
      </p>
      <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{book.name}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Choisissez le nombre de questions pour cette partie.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((size) => (
          <button
            key={String(size)}
            onClick={() => onSelect(size)}
            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              selected === size
                ? 'border-cyan-500 bg-cyan-100 text-cyan-900 dark:border-cyan-500 dark:bg-cyan-900/40 dark:text-cyan-100'
                : 'border-slate-300 bg-white/80 text-slate-700 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {labelForSize(size)}
          </button>
        ))}
      </div>

      {isLoadingPool ? (
        <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Chargement des questions...
        </p>
      ) : null}

      {isPreparing ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
            {loadingLabel ?? 'Préparation de la session en cours...'}
          </p>
          {loadingProgress && loadingProgress.total > 0 ? (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-cyan-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Chargement {loadingProgress.current}/{loadingProgress.total}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {poolError ? (
        <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
          {poolError}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          onClick={onStart}
          disabled={isLoadingPool || isPreparing || !!poolError}
          className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Commencer
        </button>
        <button
          onClick={onBack}
          disabled={isPreparing}
          className="rounded-2xl border border-slate-300 bg-white/70 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Retour aux livres
        </button>
        {isPreparing && onCancelLoading ? (
          <button
            onClick={onCancelLoading}
            className="rounded-2xl border border-rose-300 bg-rose-50 px-6 py-3 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50"
          >
            Annuler
          </button>
        ) : null}
      </div>
    </section>
  );
}
