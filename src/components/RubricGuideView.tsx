import { CRITERIA_LIST, MAX_TOTAL_SCORE } from '../types/scoring';

const PERFORMANCE_TIERS = [
  {
    range: '85 – 100',
    label: 'Cemerlang',
    description:
      'Sajian menonjolkan kreativiti luar biasa, rasa yang seimbang sempurna, persembahan menarik, amalan kebersihan teliti serta kerjasama pasukan yang cemerlang.',
  },
  {
    range: '70 – 84',
    label: 'Kepujian',
    description:
      'Hidangan berkualiti tinggi dengan rasa yang enak, susunan kemas dan tahap kebersihan yang baik serta disiapkan dalam tempoh masa yang ditetapkan.',
  },
  {
    range: '50 – 69',
    label: 'Memuaskan',
    description:
      'Sajian menepati asas masakan dengan persembahan dan kebersihan yang sederhana; masih terdapat ruang penambahbaikan dari segi rasa atau pengurusan masa.',
  },
  {
    range: '0 – 49',
    label: 'Asas / Perlu Bimbingan',
    description:
      'Sajian kurang lengkap, keseimbangan rasa perlu diperbaiki, kebersihan stesen kurang terurus atau pengurusan masa kumpulan tidak menepati jadual.',
  },
];

export default function RubricGuideView() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-xs font-medium tracking-wide text-emerald-700">
          Rujukan Piawaian Hakim
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Panduan Rubrik Pemarkahan Rasmi
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
          Pecahan wajaran pemarkahan berjumlah {MAX_TOTAL_SCORE} markah penuh
          merangkumi lima aspek utama penilaian pertandingan masakan.
        </p>
      </div>

      {/* Criteria Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
        {CRITERIA_LIST.map((criterion) => (
          <div
            key={criterion.key}
            className="grid grid-cols-1 gap-6 p-6 md:grid-cols-12"
          >
            <div className="md:col-span-5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                  0{criterion.number}.
                </span>
                <h2 className="text-base font-semibold text-slate-900">
                  {criterion.title}
                </h2>
              </div>
              <p className="mt-1 font-mono text-xs font-medium text-slate-500 tabular-nums">
                Wajaran Maksimum: {criterion.maxScore} markah (
                {criterion.maxScore}%)
              </p>
              <p className="mt-2.5 text-sm text-slate-600">
                {criterion.description}
              </p>
            </div>

            <div className="md:col-span-7">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                Indikator Penilaian Utama
              </h3>
              <ul className="mt-2.5 space-y-2">
                {criterion.indicators.map((indicator) => (
                  <li
                    key={indicator}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-700 shrink-0" />
                    <span>{indicator}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Tiers */}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Skala Tahap Pencapaian Keseluruhan
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERFORMANCE_TIERS.map((tier) => (
            <div
              key={tier.label}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
            >
              <p className="font-mono text-sm font-bold text-emerald-800 tabular-nums">
                {tier.range} Markah
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                {tier.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {tier.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
