import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createScore,
  deleteScore,
  fetchScores,
  updateScore,
} from './services/scoresApi';
import ScoringFormView, { type AutoSaveStatus } from './components/ScoringFormView';
import RecordsView from './components/RecordsView';
import RubricGuideView from './components/RubricGuideView';
import type {
  CriterionKey,
  ScorePayload,
  ScoreRecord,
  ScoresMap,
} from './types/scoring';

type ActiveTab = 'borang' | 'senarai' | 'rubrik';

const INITIAL_SCORES: ScoresMap = {
  kreativiti: 0,
  rasa: 0,
  persembahan: 0,
  kebersihan: 0,
  kerjasama: 0,
};

const AUTOSAVE_STORAGE_KEY = 'hakim_autosave_enabled';

function buildPayloadKey(payload: ScorePayload): string {
  return JSON.stringify(payload);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('borang');

  // Database records state
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [namaKumpulan, setNamaKumpulan] = useState<string>('');
  const [kelas, setKelas] = useState<string>('');
  const [namaHakim, setNamaHakim] = useState<string>('');
  const [scores, setScores] = useState<ScoresMap>(INITIAL_SCORES);
  const [ulasan, setUlasan] = useState<string>('');

  // Auto-save preference & feedback
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const lastSavedKeyRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);

  const loadAllRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    setLoadError(null);
    try {
      const data = await fetchScores();
      setRecords(data);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat turun senarai markah daripada pangkalan data.',
      );
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    void loadAllRecords();
  }, [loadAllRecords]);

  const handleToggleAutoSave = (enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    try {
      window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, String(enabled));
    } catch {
      // Ignore storage failures in restricted contexts
    }
    if (!enabled && debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const persistForm = useCallback(
    async (
      payload: ScorePayload,
      targetId: string | null,
      isAuto: boolean,
    ): Promise<void> => {
      const key = buildPayloadKey(payload);
      if (isAuto && key === lastSavedKeyRef.current && targetId !== null) {
        return;
      }

      if (isAuto) {
        setAutoSaveStatus('saving');
      } else {
        setIsSubmitting(true);
      }
      setSaveError(null);

      try {
        let savedRecord: ScoreRecord;
        if (targetId) {
          savedRecord = await updateScore(targetId, payload);
          setRecords((prev) =>
            prev.map((item) => (item.id === savedRecord.id ? savedRecord : item)),
          );
        } else {
          savedRecord = await createScore(payload);
          setEditingId(savedRecord.id);
          setRecords((prev) => [savedRecord, ...prev]);
        }
        lastSavedKeyRef.current = key;
        setLastSavedAt(savedRecord.updatedAt);
        setAutoSaveStatus('saved');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan markah ke pangkalan data.';
        setSaveError(message);
        setAutoSaveStatus('error');
      } finally {
        if (!isAuto) {
          setIsSubmitting(false);
        }
      }
    },
    [],
  );

  // Debounced auto-save when autoSaveEnabled is ON and required fields are present
  useEffect(() => {
    if (!autoSaveEnabled) {
      return;
    }

    const trimmedGroup = namaKumpulan.trim();
    const trimmedClass = kelas.trim();
    const trimmedJudge = namaHakim.trim();

    if (!trimmedGroup || !trimmedClass || !trimmedJudge) {
      setAutoSaveStatus('waiting-fields');
      return;
    }

    const payload: ScorePayload = {
      namaKumpulan: trimmedGroup,
      kelas: trimmedClass,
      namaHakim: trimmedJudge,
      scores,
      ulasan: ulasan.trim(),
    };

    const payloadKey = buildPayloadKey(payload);
    if (payloadKey === lastSavedKeyRef.current) {
      return;
    }

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void persistForm(payload, editingId, true);
    }, 650);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [
    autoSaveEnabled,
    editingId,
    namaKumpulan,
    kelas,
    namaHakim,
    scores,
    ulasan,
    persistForm,
  ]);

  const handleManualSave = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmedGroup = namaKumpulan.trim();
    const trimmedClass = kelas.trim();
    const trimmedJudge = namaHakim.trim();

    if (!trimmedGroup || !trimmedClass || !trimmedJudge) {
      setSaveError(
        'Sila lengkapkan Nama Kumpulan, Kelas dan Nama Hakim sebelum menyimpan.',
      );
      return;
    }

    const payload: ScorePayload = {
      namaKumpulan: trimmedGroup,
      kelas: trimmedClass,
      namaHakim: trimmedJudge,
      scores,
      ulasan: ulasan.trim(),
    };

    void persistForm(payload, editingId, false);
  };

  const handleResetForm = (keepJudgeName = true) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setEditingId(null);
    setNamaKumpulan('');
    setKelas('');
    if (!keepJudgeName) {
      setNamaHakim('');
    }
    setScores(INITIAL_SCORES);
    setUlasan('');
    setSaveError(null);
    setLastSavedAt(null);
    setAutoSaveStatus('idle');
    lastSavedKeyRef.current = '';
    setActiveTab('borang');
  };

  const handleEditRecord = (record: ScoreRecord) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const snapshot: ScorePayload = {
      namaKumpulan: record.namaKumpulan,
      kelas: record.kelas,
      namaHakim: record.namaHakim,
      scores: { ...record.scores },
      ulasan: record.ulasan,
    };
    lastSavedKeyRef.current = buildPayloadKey(snapshot);
    setEditingId(record.id);
    setNamaKumpulan(record.namaKumpulan);
    setKelas(record.kelas);
    setNamaHakim(record.namaHakim);
    setScores({ ...record.scores });
    setUlasan(record.ulasan);
    setLastSavedAt(record.updatedAt);
    setSaveError(null);
    setAutoSaveStatus('saved');
    setActiveTab('borang');
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteScore(id);
    setRecords((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      handleResetForm(true);
    }
  };

  const handleChangeScore = (key: CriterionKey, value: number) => {
    setScores((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('borang')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Borang Pemarkahan Hakim
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveTab('borang')}
              className={`border-b-2 py-5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'borang'
                  ? 'border-emerald-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Borang Pemarkahan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('senarai')}
              className={`border-b-2 py-5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'senarai'
                  ? 'border-emerald-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Senarai Markah ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rubrik')}
              className={`border-b-2 py-5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'rubrik'
                  ? 'border-emerald-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Panduan Rubrik
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => handleResetForm(true)}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Rekod Baharu
            </button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="flex border-t border-slate-100 px-4 md:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('borang')}
            className={`flex-1 border-b-2 py-2.5 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'borang'
                ? 'border-emerald-700 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
          >
            Borang
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('senarai')}
            className={`flex-1 border-b-2 py-2.5 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'senarai'
                ? 'border-emerald-700 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
          >
            Senarai ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rubrik')}
            className={`flex-1 border-b-2 py-2.5 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'rubrik'
                ? 'border-emerald-700 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
          >
            Rubrik
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {activeTab === 'borang' && (
          <ScoringFormView
            editingId={editingId}
            namaKumpulan={namaKumpulan}
            kelas={kelas}
            namaHakim={namaHakim}
            scores={scores}
            ulasan={ulasan}
            autoSaveEnabled={autoSaveEnabled}
            autoSaveStatus={autoSaveStatus}
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            isSubmitting={isSubmitting}
            recentRecords={records}
            onChangeNamaKumpulan={setNamaKumpulan}
            onChangeKelas={setKelas}
            onChangeNamaHakim={setNamaHakim}
            onChangeScore={handleChangeScore}
            onChangeUlasan={setUlasan}
            onToggleAutoSave={handleToggleAutoSave}
            onManualSave={handleManualSave}
            onResetForm={handleResetForm}
            onEditRecord={handleEditRecord}
            onNavigateRecords={() => setActiveTab('senarai')}
          />
        )}

        {activeTab === 'senarai' && (
          <RecordsView
            records={records}
            isLoading={isLoadingRecords}
            loadError={loadError}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onStartNewForm={() => handleResetForm(true)}
            onRetryLoad={() => void loadAllRecords()}
          />
        )}

        {activeTab === 'rubrik' && <RubricGuideView />}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-5">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>Sistem Pemarkahan Hakim Pertandingan Masakan</span>
          <span>Pangkalan Data Tempatan · Kiraan Automatik 100 Markah</span>
        </div>
      </footer>
    </div>
  );
}
