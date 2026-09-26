// Bawaslos — Database layer menggunakan @libsql/client (kompatibel Turso & SQLite).
// Berjalan di Serverless (Vercel) via cloud (Turso) atau file lokal di lingkungan dev.
import { createClient, type Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

const globalForDb = globalThis as unknown as {
  __bawaslosDb?: Client;
  __bawaslosDbInit?: Promise<void>;
};

const SCHEMA_SQL = `
  -- Akun pemilih tetap (Akun 1, 2, 3). Token dibuat/direset oleh admin.
  CREATE TABLE IF NOT EXISTS accounts (
    id          INTEGER PRIMARY KEY,        -- 1, 2, 3 (tetap)
    label       TEXT NOT NULL,              -- "Akun 1"
    token_hash  TEXT,                       -- hash token saat ini (NULL = belum dibuat)
    token_hint  TEXT,                       -- 4 digit awal untuk konfirmasi admin
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Admin tunggal pengelola sistem.
  CREATE TABLE IF NOT EXISTS admin (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    username     TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt         TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Pasangan calon ketua & wakil ketua (maks 3 kotak di halaman utama).
  CREATE TABLE IF NOT EXISTS pairs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    number      INTEGER NOT NULL UNIQUE,    -- 1,2,3 urutan kotak
    chair_name  TEXT NOT NULL,
    vice_name   TEXT NOT NULL,
    vision      TEXT NOT NULL DEFAULT '',
    photo_url   TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1, -- 1 = tampil di halaman utama
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Berita / pengumuman (open recruitment dll).
  CREATE TABLE IF NOT EXISTS news (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    cover_url   TEXT,
    featured    INTEGER NOT NULL DEFAULT 0,
    is_new      INTEGER NOT NULL DEFAULT 0,
    published   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Suara. Satu baris = satu kali memilih.
  CREATE TABLE IF NOT EXISTS votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_no    INTEGER NOT NULL UNIQUE,    -- 1,2,3,... (global sequence)
    account_id  INTEGER NOT NULL,           -- 1,2,3
    pair_id     INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (pair_id) REFERENCES pairs(id)
  );

  -- Penanda bahwa akun sedang dalam sesi login token (belum memilih).
  CREATE TABLE IF NOT EXISTS voter_sessions (
    token_hash  TEXT PRIMARY KEY,
    account_id  INTEGER NOT NULL,
    login_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  -- Log audit semua kejadian penting.
  CREATE TABLE IF NOT EXISTS audit (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    action      TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT '',
    account_id  INTEGER,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- State scoreboard publik (dikendalikan admin).
  CREATE TABLE IF NOT EXISTS scoreboard_state (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    published   INTEGER NOT NULL DEFAULT 0,
    revealed    INTEGER NOT NULL DEFAULT 0,
    voting_open INTEGER NOT NULL DEFAULT 1
  );

  -- Pengaturan umum (logo, maskot, nama organisasi, dll).
  CREATE TABLE IF NOT EXISTS settings (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    org_name        TEXT NOT NULL DEFAULT 'OSIS',
    org_subtitle    TEXT NOT NULL DEFAULT 'Pemilihan Ketua & Wakil Ketua',
    logo_url        TEXT NOT NULL DEFAULT '',
    mascot_url      TEXT NOT NULL DEFAULT ''
  );

  -- Panduan Pemilos: peraturan & tata cara (disunting admin).
  CREATE TABLE IF NOT EXISTS rules (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    headline    TEXT NOT NULL DEFAULT 'Peraturan & Tata Cara Pemilihan',
    body        TEXT NOT NULL DEFAULT ''
  );

  -- Daftar Pemilih (DPT / batch token 1-300 dst untuk cetak Excel/slip)
  CREATE TABLE IF NOT EXISTS voters (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_no    INTEGER NOT NULL UNIQUE,
    name        TEXT NOT NULL DEFAULT '',
    token       TEXT NOT NULL UNIQUE,
    is_used     INTEGER NOT NULL DEFAULT 0,
    used_at     TEXT,
    used_booth  INTEGER,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_voters_token ON voters(token);
  CREATE INDEX IF NOT EXISTS idx_voters_no ON voters(voter_no);
`;

async function seed(db: Client) {
  try {
    const accRes = await db.execute('SELECT COUNT(*) AS c FROM accounts');
    const count = Number(accRes.rows[0]?.c ?? accRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      await db.execute({ sql: 'INSERT INTO accounts (id, label) VALUES (?, ?)', args: [1, 'Akun 1'] });
      await db.execute({ sql: 'INSERT INTO accounts (id, label) VALUES (?, ?)', args: [2, 'Akun 2'] });
      await db.execute({ sql: 'INSERT INTO accounts (id, label) VALUES (?, ?)', args: [3, 'Akun 3'] });
    }
  } catch (e) {
    console.error('Seed accounts notice:', e);
  }

  try {
    const adminRes = await db.execute('SELECT COUNT(*) AS c FROM admin');
    const count = Number(adminRes.rows[0]?.c ?? adminRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      const crypto = require('node:crypto') as typeof import('node:crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const password_hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
      await db.execute({
        sql: 'INSERT INTO admin (id, username, password_hash, salt) VALUES (1, ?, ?, ?)',
        args: ['admin', password_hash, salt],
      });
    }
  } catch (e) {
    console.error('Seed admin notice:', e);
  }

  try {
    const sbRes = await db.execute('SELECT COUNT(*) AS c FROM scoreboard_state');
    const count = Number(sbRes.rows[0]?.c ?? sbRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      await db.execute('INSERT INTO scoreboard_state (id, published, revealed, voting_open) VALUES (1, 0, 0, 1)');
    }
  } catch (e) {
    console.error('Seed scoreboard notice:', e);
  }

  try {
    const setRes = await db.execute('SELECT COUNT(*) AS c FROM settings');
    const count = Number(setRes.rows[0]?.c ?? setRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (id, org_name, org_subtitle, logo_url, mascot_url) VALUES (1, ?, ?, ?, ?)',
        args: ['BAWASLOS', 'Badan Pengawas Pemilihan Osis — SMK Negeri 64 Jakarta', '/logo.png', '/maskot.png'],
      });
    } else {
      await db.execute("UPDATE settings SET logo_url = '/logo.png' WHERE id = 1 AND (logo_url IS NULL OR logo_url = '')");
      await db.execute("UPDATE settings SET mascot_url = '/maskot.png' WHERE id = 1 AND (mascot_url IS NULL OR mascot_url = '')");
      await db.execute("UPDATE settings SET org_name = 'BAWASLOS' WHERE id = 1 AND (org_name = 'OSIS' OR org_name IS NULL)");
      await db.execute("UPDATE settings SET org_subtitle = 'Badan Pengawas Pemilihan Osis — SMK Negeri 64 Jakarta' WHERE id = 1 AND (org_subtitle = 'Pemilihan Ketua & Wakil Ketua' OR org_subtitle IS NULL)");
    }
  } catch (e) {
    console.error('Seed settings notice:', e);
  }

  try {
    const pairsRes = await db.execute('SELECT COUNT(*) AS c FROM pairs');
    const count = Number(pairsRes.rows[0]?.c ?? pairsRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      await db.execute({
        sql: 'INSERT INTO pairs (number, chair_name, vice_name, vision, photo_url, active) VALUES (?, ?, ?, ?, ?, ?)',
        args: [1, 'Andi', 'Budi', 'Mewujudkan OSIS yang inovatif, inklusif, dan berprestasi berlandaskan kejujuran serta disiplin.', '/paslon-1.jpg', 1],
      });
      await db.execute({
        sql: 'INSERT INTO pairs (number, chair_name, vice_name, vision, photo_url, active) VALUES (?, ?, ?, ?, ?, ?)',
        args: [2, 'Citra', 'Dewi', 'Membangun lingkungan sekolah yang aktif dan kreatif melalui program kerja nyata untuk seluruh siswa.', '/paslon-2.jpg', 1],
      });
      await db.execute({
        sql: 'INSERT INTO pairs (number, chair_name, vice_name, vision, photo_url, active) VALUES (?, ?, ?, ?, ?, ?)',
        args: [3, 'Eka', 'Fajar', 'Menjadikan OSIS wadah aspirasi yang transparan, komunikatif, dan responsif terhadap kebutuhan siswa.', '/paslon-3.jpg', 1],
      });
    }
  } catch (e) {
    console.error('Seed pairs notice:', e);
  }

  try {
    const newsRes = await db.execute('SELECT COUNT(*) AS c FROM news');
    const count = Number(newsRes.rows[0]?.c ?? newsRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      await db.execute({
        sql: 'INSERT INTO news (title, body, cover_url, featured, is_new, published) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          'Open Recruitment Ketua & Wakil Ketua OSIS',
          'Pendaftaran pasangan calon ketua dan wakil ketua OSIS periode ini telah dibuka. Segera lengkapi berkas persyaratan dan serahkan ke panitia pemilihan. Pemilihan akan dilaksanakan secara elektronik melalui 3 akun pemilih yang disediakan.',
          '/news-1.jpg',
          1,
          0,
          1,
        ],
      });
    }
  } catch (e) {
    console.error('Seed news notice:', e);
  }

  try {
    const rulesRes = await db.execute('SELECT COUNT(*) AS c FROM rules');
    const count = Number(rulesRes.rows[0]?.c ?? rulesRes.rows[0]?.[0] ?? 0);
    if (count === 0) {
      const draft = [
        '1. Pemilihan dilaksanakan secara elektronik melalui 3 akun pemilih yang disediakan pengawas.',
        '2. Setiap akun hanya dapat menjatuhkan satu suara (satu sesi = satu pilihan).',
        '3. Token bersifat rahasia dan hanya diberikan langsung oleh pengawas pemilihan.',
        '4. Pemilih menyalin nomor urut global (Pemilih ke-1, 2, 3, …) yang muncul setelah memilih.',
        '5. Hasil diumumkan secara bertahap (reveal) oleh pengawas melalui scoreboard resmi.',
        '6. Keputusan pengawas bersifat final.',
      ].join('\n');
      await db.execute({
        sql: 'INSERT INTO rules (id, headline, body) VALUES (1, ?, ?)',
        args: ['Peraturan & Tata Cara Pemilihan', draft],
      });
    }
  } catch (e) {
    console.error('Seed rules notice:', e);
  }
}

async function migrate(db: Client) {
  try {
    await db.execute('ALTER TABLE news ADD COLUMN cover_url TEXT');
  } catch {}
  try {
    await db.execute('ALTER TABLE news ADD COLUMN featured INTEGER NOT NULL DEFAULT 0');
  } catch {}
  try {
    await db.execute('ALTER TABLE news ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0');
  } catch {}
  try {
    await db.execute('ALTER TABLE scoreboard_state ADD COLUMN voting_open INTEGER NOT NULL DEFAULT 1');
  } catch {}
}

export function getDb(): Client {
  if (globalForDb.__bawaslosDb) return globalForDb.__bawaslosDb;

  let url = process.env.TURSO_DATABASE_URL || process.env.turso_database_url;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.turso_auth_token;

  if (!url) {
    // Di Vercel serverless, folder /tmp adalah direktori yang memiliki akses tulis (writable).
    // Di lokal, gunakan folder .data di root project.
    const isVercel = Boolean(process.env.VERCEL);
    const dbPath = isVercel
      ? path.join('/tmp', 'bawaslos.db')
      : path.resolve(process.cwd(), '.data', 'bawaslos.db');
    url = `file:${dbPath}`;
  }

  if (url.startsWith('file:') && typeof process !== 'undefined') {
    const filePath = url.replace('file:', '');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  }

  const client = createClient({
    url,
    authToken,
  });

  globalForDb.__bawaslosDb = client;
  return client;
}

export async function ensureDb(): Promise<Client> {
  const db = getDb();
  if (!globalForDb.__bawaslosDbInit) {
    globalForDb.__bawaslosDbInit = (async () => {
      try {
        await db.executeMultiple(SCHEMA_SQL);
      } catch (e) {
        console.error('executeMultiple schema notice:', e);
      }
      await migrate(db);
      await seed(db);
    })().catch((err) => {
      globalForDb.__bawaslosDbInit = undefined;
      console.error('Error saat inisialisasi database:', err);
      throw err;
    });
  }
  await globalForDb.__bawaslosDbInit;
  return db;
}
