import { useMemo, useState } from 'react';
import {
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  CRITERIA_LIST,
  getPerformanceBand,
  type ScoreRecord,
} from '../types/scoring';

type SortOption = 'score-desc' | 'score-asc' | 'updated-desc';

interface RecordsViewProps {
  records: ScoreRecord[];
  isLoading: boolean;
  loadError: string | null;
  onEditRecord: (record: ScoreRecord) => void;
  onDeleteRecord: (id: string) => Promise<void>;
  onStartNewForm: () => void;
  onRetryLoad: () => void;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecordsView({
  records,
  isLoading,
  loadError,
  onEditRecord,
  onDeleteRecord,
  onStartNewForm,
  onRetryLoad,
}: RecordsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('ALL');
  const [selectedHakim, setSelectedHakim] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('score-desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const uniqueClasses = useMemo(() => {
    const set = new Set(records.map((r) => r.kelas));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const uniqueJudges = useMemo(() => {
    const set = new Set(records.map((r) => r.namaHakim));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = records.filter((record) => {
      if (selectedKelas !== 'ALL' && record.kelas !== selectedKelas) {
        return false;
      }
      if (selectedHakim !== 'ALL' && record.namaHakim !== selectedHakim) {
        return false;
      }
      if (!q) return true;
      return (
        record.namaKumpulan.toLowerCase().includes(q) ||
        record.kelas.toLowerCase().includes(q) ||
        record.namaHakim.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'score-desc') {
        if (b.jumlahMarkah !== a.jumlahMarkah) {
          return b.jumlahMarkah - a.jumlahMarkah;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'score-asc') {
        if (a.jumlahMarkah !== b.jumlahMarkah) {
          return a.jumlahMarkah - b.jumlahMarkah;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [records, searchQuery, selectedKelas, selectedHakim, sortBy]);

  const summaryStats = useMemo(() => {
    if (records.length === 0) {
      return {
        totalTeams: 0,
        averageScore: '0.0',
        highestScore: 0,
        judgeCount: 0,
      };
    }
    const sum = records.reduce((acc, r) => acc + r.jumlahMarkah, 0);
    const highest = Math.max(...records.map((r) => r.jumlahMarkah));
    const judges = new Set(records.map((r) => r.namaHakim.toLowerCase()));
    return {
      totalTeams: records.length,
      averageScore: (sum / records.length).toFixed(1),
      highestScore: highest,
      judgeCount: judges.size,
    };
  }, [records]);

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Kedudukan',
      'Nama Kumpulan',
      'Kelas',
      'Nama Hakim',
      ...CRITERIA_LIST.map((c) => `${c.title} (/${c.maxScore})`),
      'Jumlah Markah (/100)',
      'Tahap',
      'Ulasan Hakim',
      'Masa Dikemas Kini',
    ];

    const rows = filteredRecords.map((r, index) => {
      const band = getPerformanceBand(r.jumlahMarkah);
      return [
        index + 1,
        r.namaKumpulan,
        r.kelas,
        r.namaHakim,
        r.scores.kreativiti,
        r.scores.rasa,
        r.scores.persembahan,
        r.scores.kebersihan,
        r.scores.kerjasama,
        r.jumlahMarkah,
        band.label,
        r.ulasan,
        formatDateTime(r.updatedAt),
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = `\uFEFF${headers.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'keputusan-pemarkahan-hakim.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-emerald-700">
            Pangkalan Data Keputusan
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Senarai Markah & Kedudukan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Semak semua rekod markah yang disimpan oleh hakim, tapis mengikut
            kelas atau muat turun keputusan CSV.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredRecords.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Muat Turun CSV</span>
        </button>
      </div>

      {/* 4-Column Summary KPI Strip */}
      <div className="mb-6 grid grid-cols-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Jumlah Rekod</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summaryStats.totalTeams}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Purata Markah</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summaryStats.averageScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Markah Tertinggi</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {summaryStats.highestScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Hakim Terlibat</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summaryStats.judgeCount}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama kumpulan, kelas atau nama hakim..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Tapis mengikut kelas"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-700 focus:outline-none"
          >
            <option value="ALL">Semua Kelas</option>
            {uniqueClasses.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <select
            aria-label="Tapis mengikut hakim"
            value={selectedHakim}
            onChange={(e) => setSelectedHakim(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-700 focus:outline-none"
          >
            <option value="ALL">Semua Hakim</option>
            {uniqueJudges.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>

          <select
            aria-label="Susunan rekod"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-700 focus:outline-none"
          >
            <option value="score-desc">Markah Tertinggi</option>
            <option value="score-asc">Markah Terendah</option>
            <option value="updated-desc">Terkini Dikemas Kini</option>
          </select>
        </div>
      </div>

      {/* Data Table / States */}
      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-rose-800">{loadError}</p>
          <button
            type="button"
            onClick={onRetryLoad}
            className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
          >
            Cuba Semula
          </button>
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="h-11 w-full animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Belum ada rekod markah disimpan
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            Mulakan penilaian dengan mengisi maklumat kumpulan, kelas dan nama
            hakim pada borang pemarkahan.
          </p>
          <button
            type="button"
            onClick={onStartNewForm}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Isi Borang Pertama</span>
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            Tiada rekod sepadan dengan carian
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cuba tukar kata kunci carian atau tetapkan semula penapis kelas dan
            hakim.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedKelas('ALL');
              setSelectedHakim('ALL');
            }}
            className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Tetap Semula Penapis
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 pl-5 pr-3 w-14">#</th>
                  <th className="py-3 px-3">Nama Kumpulan & Kelas</th>
                  <th className="py-3 px-3">Nama Hakim</th>
                  <th className="py-3 px-2 text-right font-mono tabular-nums" title="Kreativiti dan inovasi">
                    K1 (/25)
                  </th>
                  <th className="py-3 px-2 text-right font-mono tabular-nums" title="Rasa dan kualiti makanan">
                    K2 (/25)
                  </th>
                  <th className="py-3 px-2 text-right font-mono tabular-nums" title="Persembahan dan kekemasan">
                    K3 (/20)
                  </th>
                  <th className="py-3 px-2 text-right font-mono tabular-nums" title="Kebersihan dan keselamatan makanan">
                    K4 (/20)
                  </th>
                  <th className="py-3 px-2 text-right font-mono tabular-nums" title="Kerjasama kumpulan dan pengurusan masa">
                    K5 (/10)
                  </th>
                  <th className="py-3 px-3 text-right font-mono tabular-nums">
                    Jumlah
                  </th>
                  <th className="py-3 px-3">Dikemas Kini</th>
                  <th className="py-3 pl-3 pr-5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((record, idx) => {
                  const band = getPerformanceBand(record.jumlahMarkah);
                  const isConfirming = confirmDeleteId === record.id;
                  const isDeleting = deletingId === record.id;

                  return (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="py-3.5 pl-5 pr-3 font-mono text-xs font-semibold text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-900">
                          {record.namaKumpulan}
                        </p>
                        <p className="text-xs text-slate-500">{record.kelas}</p>
                        {record.ulasan && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                            {record.ulasan}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700">
                        {record.namaHakim}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                        {record.scores.kreativiti}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                        {record.scores.rasa}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                        {record.scores.persembahan}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                        {record.scores.kebersihan}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                        {record.scores.kerjasama}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
                          {record.jumlahMarkah}/100
                        </p>
                        <p className="text-[11px] font-medium text-emerald-700">
                          {band.label}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(record.updatedAt)}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleConfirmDelete(record.id)}
                              className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                            >
                              {isDeleting ? 'Memadam...' : 'Sahkan'}
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditRecord(record)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Sunting</span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Padam rekod ${record.namaKumpulan}`}
                              onClick={() => setConfirmDeleteId(record.id)}
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
