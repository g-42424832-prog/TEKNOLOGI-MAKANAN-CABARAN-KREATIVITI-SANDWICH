export type CriterionKey =
  | 'kreativiti'
  | 'rasa'
  | 'persembahan'
  | 'kebersihan'
  | 'kerjasama';

export interface CriterionMeta {
  key: CriterionKey;
  number: number;
  title: string;
  maxScore: number;
  description: string;
  indicators: string[];
}

export const CRITERIA_LIST: CriterionMeta[] = [
  {
    key: 'kreativiti',
    number: 1,
    title: 'Kreativiti dan inovasi',
    maxScore: 25,
    description:
      'Keaslian idea sajian, pengolahan bahan secara kreatif serta keunikan teknik masakan yang diketengahkan.',
    indicators: [
      'Gabungan bahan dan perisa yang kreatif serta seimbang',
      'Konsep hidangan asli dan berdaya cipta',
      'Penggunaan teknik penyediaan yang inovatif',
    ],
  },
  {
    key: 'rasa',
    number: 2,
    title: 'Rasa dan kualiti makanan',
    maxScore: 25,
    description:
      'Keseimbangan perisa, tekstur bahan, tahap kematangan masakan serta kesesuaian suhu dan aroma hidangan.',
    indicators: [
      'Rasa seimbang, enak dan menepati citarasa sajian',
      'Tekstur dan kematangan bahan dimasak sempurna',
      'Aroma menyelerakan dan kualiti bahan terpelihara',
    ],
  },
  {
    key: 'persembahan',
    number: 3,
    title: 'Persembahan dan kekemasan',
    maxScore: 20,
    description:
      'Susun atur pinggan, keserasian warna, hiasan sajian yang sesuai dimakan serta kekemasan keseluruhan meja.',
    indicators: [
      'Gubahan dan susun atur hidangan kemas serta menarik',
      'Kombinasi warna dan saiz hidangan seimbang',
      'Hiasan (garnish) relevan dan bersesuaian dengan menu',
    ],
  },
  {
    key: 'kebersihan',
    number: 4,
    title: 'Kebersihan dan keselamatan makanan',
    maxScore: 20,
    description:
      'Amalan kebersihan diri peserta, pengendalian bahan mentah yang selamat serta kebersihan stesen kerja.',
    indicators: [
      'Pemakaian apron, penutup kepala dan sarung tangan dengan betul',
      'Pengasingan bahan mentah dan makanan siap dimasak',
      'Meja kerja dan peralatan sentiasa bersih sepanjang sesi',
    ],
  },
  {
    key: 'kerjasama',
    number: 5,
    title: 'Kerjasama kumpulan dan pengurusan masa',
    maxScore: 10,
    description:
      'Pembahagian tugas yang jelas, komunikasi berkesan antara ahli dan keupayaan menyiapkan hidangan tepat pada waktunya.',
    indicators: [
      'Agihan tugas teratur dan komunikasi harmoni dalam pasukan',
      'Menepati tempoh masa pertandingan yang ditetapkan',
      'Disiplin serta etika kerja berpasukan yang tinggi',
    ],
  },
];

export const MAX_TOTAL_SCORE = 100;

export interface ScoresMap {
  kreativiti: number;
  rasa: number;
  persembahan: number;
  kebersihan: number;
  kerjasama: number;
}

export interface ScoreRecord {
  id: string;
  namaKumpulan: string;
  kelas: string;
  namaHakim: string;
  scores: ScoresMap;
  jumlahMarkah: number;
  ulasan: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScorePayload {
  namaKumpulan: string;
  kelas: string;
  namaHakim: string;
  scores: ScoresMap;
  ulasan: string;
}

export function calculateTotalScore(scores: ScoresMap): number {
  return (
    scores.kreativiti +
    scores.rasa +
    scores.persembahan +
    scores.kebersihan +
    scores.kerjasama
  );
}

export function getPerformanceBand(total: number): {
  label: string;
  tone: 'emerald' | 'sky' | 'amber' | 'slate';
} {
  if (total >= 85) {
    return { label: 'Cemerlang', tone: 'emerald' };
  }
  if (total >= 70) {
    return { label: 'Kepujian', tone: 'sky' };
  }
  if (total >= 50) {
    return { label: 'Memuaskan', tone: 'amber' };
  }
  return { label: 'Asas', tone: 'slate' };
}
