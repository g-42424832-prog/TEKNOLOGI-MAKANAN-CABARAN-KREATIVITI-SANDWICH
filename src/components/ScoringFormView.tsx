import {
  CheckCircle2,
  Database,
  Minus,
  Plus,
  RotateCcw,
  Save,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  CRITERIA_LIST,
  MAX_TOTAL_SCORE,
  calculateTotalScore,
  getPerformanceBand,
  type CriterionKey,
  type ScoreRecord,
  type ScoresMap,
} from '../types/scoring';

export type AutoSaveStatus =
  | 'idle'
  | 'waiting-fields'
  | 'saving'
  | 'saved'
  | 'error';

interface ScoringFormViewProps {
  editingId: string | null;
  namaKumpulan: string;
  kelas: string;
  namaHakim: string;
  scores: ScoresMap;
  ulasan: string;
  autoSaveEnabled: boolean;
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: string | null;
  saveError: string | null;
  isSubmitting: boolean;
  recentRecords: ScoreRecord[];
  onChangeNamaKumpulan: (value: string) => void;
  onChangeKelas: (value: string) => void;
  onChangeNamaHakim: (value: string) => void;
  onChangeScore: (key: CriterionKey, value: number) => void;
  onChangeUlasan: (value: string) => void;
  onToggleAutoSave: (enabled: boolean) => void;
  onManualSave: () => void;
  onResetForm: (keepJudgeName?: boolean) => void;
  onEditRecord: (record: ScoreRecord) => void;
  onNavigateRecords: () => void;
}

function formatSavedTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ms-MY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ScoringFormView({
  editingId,
  namaKumpulan,
  kelas,
  namaHakim,
  scores,
  ulasan,
  autoSaveEnabled,
  autoSaveStatus,
  lastSavedAt,
  saveError,
  isSubmitting,
  recentRecords,
  onChangeNamaKumpulan,
  onChangeKelas,
  onChangeNamaHakim,
  onChangeScore,
  onChangeUlasan,
  onToggleAutoSave,
  onManualSave,
  onResetForm,
  onEditRecord,
  onNavigateRecords,
}: ScoringFormViewProps) {
  const totalScore = calculateTotalScore(scores);
  const band = getPerformanceBand(totalScore);
  const identityComplete =
    namaKumpulan.trim().length > 0 &&
    kelas.trim().length > 0 &&
    namaHakim.trim().length > 0;

  const bandColorClass =
    band.tone === 'emerald'
      ? 'text-emerald-700'
      : band.tone === 'sky'
        ? 'text-sky-700'
        : band.tone === 'amber'
          ? 'text-amber-700'
          : 'text-slate-600';

  const handleNumberInputChange = (
    key: CriterionKey,
    maxScore: number,
    rawValue: string,
  ) => {
    if (rawValue === '') {
      onChangeScore(key, 0);
      return;
    }
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, Math.min(maxScore, Math.round(parsed)));
    onChangeScore(key, clamped);
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title & Context Header */}
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-emerald-700">
            Penilaian Pertandingan Masakan
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Borang Pemarkahan Hakim
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Lengkapkan butiran peserta serta nama hakim, kemudian berikan markah
            mengikut lima kriteria rasmi yang ditetapkan.
          </p>
        </div>

        {/* Auto-Save Switch Bar */}
        <div className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-emerald-700 shrink-0" />
            <div>
              <label
                htmlFor="autosave-toggle"
                className="block text-sm font-semibold text-slate-900 cursor-pointer"
              >
                Simpan Automatik ke Pangkalan Data
              </label>
              <p className="text-xs text-slate-500">
                {autoSaveEnabled
                  ? 'Markah dikemas kini secara automatik apabila diubah'
                  : 'Mod manual — tekan butang Simpan Markah untuk merekod'}
              </p>
            </div>
          </div>

          <button
            id="autosave-toggle"
            type="button"
            role="switch"
            aria-checked={autoSaveEnabled}
            onClick={() => onToggleAutoSave(!autoSaveEnabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
              autoSaveEnabled ? 'bg-emerald-700' : 'bg-slate-300'
            }`}
          >
            <span className="sr-only">
              Aktifkan simpanan automatik ke pangkalan data
            </span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                autoSaveEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Editing Banner */}
      {editingId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              Sedang menyunting rekod tersimpan untuk{' '}
              <strong className="font-semibold">
                {namaKumpulan || 'kumpulan ini'}
              </strong>
              . Perubahan akan mengemas kini rekod yang sama.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onResetForm(true)}
            className="text-xs font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Mula Rekod Baharu
          </button>
        </div>
      )}

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Zone: Identity Inputs & 5 Criteria */}
        <div className="space-y-8 lg:col-span-8">
          {/* Section 1: Participant & Judge Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Maklumat Kumpulan & Hakim
              </h2>
              <span className="text-xs text-slate-500">
                Semua ruangan bertanda * wajib diisi sebelum disimpan
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="input-nama-kumpulan"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nama Kumpulan <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-nama-kumpulan"
                  type="text"
                  maxLength={100}
                  value={namaKumpulan}
                  onChange={(e) => onChangeNamaKumpulan(e.target.value)}
                  placeholder="Contoh: Kumpulan Sri Melati"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
              </div>

              <div>
                <label
                  htmlFor="input-kelas"
                  className="block text-sm font-medium text-slate-700"
                >
                  Kelas <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-kelas"
                  type="text"
                  maxLength={60}
                  value={kelas}
                  onChange={(e) => onChangeKelas(e.target.value)}
                  placeholder="Contoh: 4 Sains 1"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
              </div>

              <div>
                <label
                  htmlFor="input-nama-hakim"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nama Hakim <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-nama-hakim"
                  type="text"
                  maxLength={100}
                  value={namaHakim}
                  onChange={(e) => onChangeNamaHakim(e.target.value)}
                  placeholder="Contoh: Pn. Hajah Aminah"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Markah Yang Diberikan */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Markah Yang Diberikan
                </h2>
                <p className="text-xs text-slate-500">
                  Gunakan pelaras, butang tambah/tolak atau masukkan nombor
                  secara terus.
                </p>
              </div>
              <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                5 Kriteria · Jumlah 100 Markah
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {CRITERIA_LIST.map((criterion) => {
                const value = scores[criterion.key];
                const percentage = Math.round(
                  (value / criterion.maxScore) * 100,
                );

                return (
                  <div key={criterion.key} className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="max-w-lg">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {criterion.number}. {criterion.title}
                          </h3>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Maksimum {criterion.maxScore} markah
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {criterion.description}
                        </p>
                      </div>

                      {/* Numeric Stepper + Direct Score Box */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label={`Kurangkan markah ${criterion.title}`}
                          onClick={() =>
                            onChangeScore(criterion.key, Math.max(0, value - 1))
                          }
                          disabled={value <= 0}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <div className="flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
                          <input
                            id={`score-number-${criterion.key}`}
                            type="number"
                            min={0}
                            max={criterion.maxScore}
                            step={1}
                            value={value}
                            aria-label={`Markah ${criterion.title}`}
                            onChange={(e) =>
                              handleNumberInputChange(
                                criterion.key,
                                criterion.maxScore,
                                e.target.value,
                              )
                            }
                            className="w-11 bg-transparent text-right font-mono text-base font-bold text-slate-900 tabular-nums focus:outline-none"
                          />
                          <span className="ml-1 font-mono text-xs text-slate-400 tabular-nums">
                            /{criterion.maxScore}
                          </span>
                        </div>

                        <button
                          type="button"
                          aria-label={`Tambah markah ${criterion.title}`}
                          onClick={() =>
                            onChangeScore(
                              criterion.key,
                              Math.min(criterion.maxScore, value + 1),
                            )
                          }
                          disabled={value >= criterion.maxScore}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Interactive Range Slider */}
                    <div className="mt-4">
                      <input
                        id={`score-slider-${criterion.key}`}
                        type="range"
                        min={0}
                        max={criterion.maxScore}
                        step={1}
                        value={value}
                        aria-label={`Pelaras markah ${criterion.title}`}
                        onChange={(e) =>
                          onChangeScore(criterion.key, Number(e.target.value))
                        }
                        style={{
                          background: `linear-gradient(to right, #047857 ${percentage}%, #e2e8f0 ${percentage}%)`,
                        }}
                        className="score-slider w-full"
                      />
                      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
                        <span>0</span>
                        <span>{Math.round(criterion.maxScore / 2)}</span>
                        <span>{criterion.maxScore}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Judge Remarks */}
            <div className="border-t border-slate-200 p-6">
              <label
                htmlFor="input-ulasan"
                className="block text-sm font-medium text-slate-700"
              >
                Ulasan / Catatan Hakim (Pilihan)
              </label>
              <textarea
                id="input-ulasan"
                rows={3}
                maxLength={600}
                value={ulasan}
                onChange={(e) => onChangeUlasan(e.target.value)}
                placeholder="Catatkan kelebihan hidangan, cadangan penambahbaikan atau pemerhatian khas..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
              />
            </div>
          </section>
        </div>

        {/* Right Zone: Live Total Score & Database Actions */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-slate-500">
                JUMLAH MARKAH
              </h2>
              <span className={`text-xs font-semibold ${bandColorClass}`}>
                Tahap: {band.label}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-5xl font-bold tracking-tight text-slate-900 tabular-nums">
                {totalScore}
              </span>
              <span className="font-mono text-2xl font-medium text-slate-400 tabular-nums">
                /{MAX_TOTAL_SCORE}
              </span>
            </div>

            {/* Total Progress Bar */}
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all duration-200"
                style={{ width: `${totalScore}%` }}
              />
            </div>

            {/* 5 Criteria Breakdown */}
            <div className="mt-6 divide-y divide-slate-100 border-t border-slate-200 pt-2">
              {CRITERIA_LIST.map((criterion) => {
                const val = scores[criterion.key];
                const pct = Math.round((val / criterion.maxScore) * 100);
                return (
                  <div key={criterion.key} className="py-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate pr-3 font-medium text-slate-700">
                        {criterion.number}. {criterion.title}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {val}/{criterion.maxScore}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600/80 transition-all duration-150"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Auto-Save & Validation Status */}
            <div className="mt-5 border-t border-slate-200 pt-4">
              {saveError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="mb-4 text-xs text-slate-600">
                {autoSaveEnabled ? (
                  autoSaveStatus === 'saving' ? (
                    <span className="font-medium text-emerald-700">
                      Menyimpan secara automatik ke pangkalan data...
                    </span>
                  ) : autoSaveStatus === 'saved' && lastSavedAt ? (
                    <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Disimpan automatik · {formatSavedTime(lastSavedAt)}
                      </span>
                    </span>
                  ) : !identityComplete ? (
                    <span className="text-amber-700">
                      Lengkapkan Nama Kumpulan, Kelas dan Nama Hakim untuk
                      mengaktifkan simpanan automatik.
                    </span>
                  ) : (
                    <span>Simpanan automatik bersedia.</span>
                  )
                ) : lastSavedAt ? (
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>
                      Simpanan terakhir · {formatSavedTime(lastSavedAt)}
                    </span>
                  </span>
                ) : (
                  <span>
                    Mod manual aktif. Tekan butang di bawah untuk menyimpan ke
                    pangkalan data.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onManualSave}
                  disabled={isSubmitting || !identityComplete}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Menyimpan...'
                      : editingId
                        ? 'Kemas Kini Rekod'
                        : 'Simpan ke Pangkalan Data'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onResetForm(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Borang Kumpulan Seterusnya</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Recent Database Records Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Rekod Terkini ({recentRecords.length})
              </h3>
              <button
                type="button"
                onClick={onNavigateRecords}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentRecords.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Tiada rekod markah lagi. Rekod yang disimpan akan muncul di
                sini.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {recentRecords.slice(0, 4).map((item) => (
                  <li key={item.id} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => onEditRecord(item)}
                      className="flex w-full items-center justify-between gap-3 text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-emerald-700">
                          {item.namaKumpulan}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {item.kelas} · {item.namaHakim}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums shrink-0">
                        {item.jumlahMarkah}/100
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
