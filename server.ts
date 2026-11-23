import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ScoresMap {
  kreativiti: number;
  rasa: number;
  persembahan: number;
  kebersihan: number;
  kerjasama: number;
}

interface ScoreRecord {
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

const SCORE_LIMITS: Record<keyof ScoresMap, number> = {
  kreativiti: 25,
  rasa: 25,
  persembahan: 20,
  kebersihan: 20,
  kerjasama: 10,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'pemarkahan.json');

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDbFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readRecords(): Promise<ScoreRecord[]> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreRecord[]) : [];
  } catch {
    return [];
  }
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

async function writeRecords(records: ScoreRecord[]): Promise<void> {
  await ensureDbFile();
  const tmpFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(records, null, 2), 'utf8');
  await fs.rename(tmpFile, DB_FILE);
}

function clampScore(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > max) {
    return null;
  }
  return rounded;
}

function validateAndNormalizePayload(body: unknown): {
  ok: true;
  data: {
    namaKumpulan: string;
    kelas: string;
    namaHakim: string;
    scores: ScoresMap;
    jumlahMarkah: number;
    ulasan: string;
  };
} | {
  ok: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Format data tidak sah.' };
  }

  const raw = body as Record<string, unknown>;
  const namaKumpulan = typeof raw.namaKumpulan === 'string' ? raw.namaKumpulan.trim() : '';
  const kelas = typeof raw.kelas === 'string' ? raw.kelas.trim() : '';
  const namaHakim = typeof raw.namaHakim === 'string' ? raw.namaHakim.trim() : '';
  const ulasan = typeof raw.ulasan === 'string' ? raw.ulasan.trim().slice(0, 600) : '';

  if (!namaKumpulan || namaKumpulan.length > 100) {
    return { ok: false, error: 'Nama kumpulan wajib diisi (maksimum 100 aksara).' };
  }
  if (!kelas || kelas.length > 60) {
    return { ok: false, error: 'Kelas wajib diisi (maksimum 60 aksara).' };
  }
  if (!namaHakim || namaHakim.length > 100) {
    return { ok: false, error: 'Nama hakim wajib diisi (maksimum 100 aksara).' };
  }

  const rawScores = raw.scores;
  if (!rawScores || typeof rawScores !== 'object') {
    return { ok: false, error: 'Objek markah tidak sah.' };
  }

  const s = rawScores as Record<string, unknown>;
  const kreativiti = clampScore(s.kreativiti, SCORE_LIMITS.kreativiti);
  const rasa = clampScore(s.rasa, SCORE_LIMITS.rasa);
  const persembahan = clampScore(s.persembahan, SCORE_LIMITS.persembahan);
  const kebersihan = clampScore(s.kebersihan, SCORE_LIMITS.kebersihan);
  const kerjasama = clampScore(s.kerjasama, SCORE_LIMITS.kerjasama);

  if (
    kreativiti === null ||
    rasa === null ||
    persembahan === null ||
    kebersihan === null ||
    kerjasama === null
  ) {
    return {
      ok: false,
      error: 'Markah mestilah nombor bulat dalam julat maksimum yang dibenarkan.',
    };
  }

  const scores: ScoresMap = {
    kreativiti,
    rasa,
    persembahan,
    kebersihan,
    kerjasama,
  };

  const jumlahMarkah =
    scores.kreativiti +
    scores.rasa +
    scores.persembahan +
    scores.kebersihan +
    scores.kerjasama;

  return {
    ok: true,
    data: {
      namaKumpulan,
      kelas,
      namaHakim,
      scores,
      jumlahMarkah,
      ulasan,
    },
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/scores', async (_req: Request, res: Response) => {
    try {
      const records = await readRecords();
      const sorted = [...records].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      res.json({ records: sorted });
    } catch {
      res.status(500).json({ error: 'Gagal membaca rekod daripada pangkalan data.' });
    }
  });

  app.post('/api/scores', async (req: Request, res: Response) => {
    const validated = validateAndNormalizePayload(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const now = new Date().toISOString();
    const newRecord: ScoreRecord = {
      id: crypto.randomUUID(),
      ...validated.data,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await enqueueWrite(async () => {
        const records = await readRecords();
        records.push(newRecord);
        await writeRecords(records);
      });
      res.status(201).json({ record: newRecord });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan rekod ke pangkalan data.' });
    }
  });

  app.put('/api/scores/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id || typeof id !== 'string' || id.length > 80) {
      res.status(400).json({ error: 'ID rekod tidak sah.' });
      return;
    }

    const validated = validateAndNormalizePayload(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    let updatedRecord: ScoreRecord | null = null;
    try {
      await enqueueWrite(async () => {
        const records = await readRecords();
        const idx = records.findIndex((item) => item.id === id);
        if (idx === -1) {
          return;
        }
        const existing = records[idx];
        updatedRecord = {
          ...existing,
          ...validated.data,
          updatedAt: new Date().toISOString(),
        };
        records[idx] = updatedRecord;
        await writeRecords(records);
      });

      if (!updatedRecord) {
        res.status(404).json({ error: 'Rekod pemarkahan tidak ditemui.' });
        return;
      }

      res.json({ record: updatedRecord });
    } catch {
      res.status(500).json({ error: 'Gagal mengemas kini rekod di pangkalan data.' });
    }
  });

  app.delete('/api/scores/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id || typeof id !== 'string' || id.length > 80) {
      res.status(400).json({ error: 'ID rekod tidak sah.' });
      return;
    }

    let deleted = false;
    try {
      await enqueueWrite(async () => {
        const records = await readRecords();
        const filtered = records.filter((item) => item.id !== id);
        if (filtered.length !== records.length) {
          deleted = true;
          await writeRecords(filtered);
        }
      });

      if (!deleted) {
        res.status(404).json({ error: 'Rekod untuk dipadam tidak ditemui.' });
        return;
      }

      res.json({ deletedId: id });
    } catch {
      res.status(500).json({ error: 'Gagal memadam rekod daripada pangkalan data.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
