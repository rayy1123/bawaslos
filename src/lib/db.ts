// Bawaslos — Database layer menggunakan node:sqlite (SQLite bawaan Node 24).
// 100% gratis, tanpa layanan pihak ketiga, tanpa build native.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// Penyimpanan file di folder proyek agar persist antar restart.
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'bawaslos.db');

// Singleton agar connection tidak dibuat berulang saat dev (hot reload).
const globalForDb = globalThis as unknown as { __bawaslosDb?: DatabaseSync };

function createSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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
      published   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- Suara. Satu baris = satu kali memilih.
    -- voter_no = nomor urut GLOBAL (Pemilih ke-1,2,3,...) monoton naik.
    -- account_id = akun mana yang digunakan (1/2/3).
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
    -- Disimpan di DB agar bisa di-audit & di-reset oleh admin.
    CREATE TABLE IF NOT EXISTS voter_sessions (
      token_hash  TEXT PRIMARY KEY,           -- sama dengan accounts.token_hash saat login
      account_id  INTEGER NOT NULL,
      login_at    TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Log audit semua kejadian penting.
    CREATE TABLE IF NOT EXISTS audit (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT NOT NULL,              -- VOTE, LOGIN, TOKEN_RESET, ADMIN_LOGIN, ...
      detail      TEXT NOT NULL DEFAULT '',
      account_id  INTEGER,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- State scoreboard publik (dikendalikan admin).
    -- published = 1 => publik boleh lihat. revealed = jumlah suara yang diumbar ke publik.
    CREATE TABLE IF NOT EXISTS scoreboard_state (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      published   INTEGER NOT NULL DEFAULT 0,
      revealed    INTEGER NOT NULL DEFAULT 0
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
      voter_no    INTEGER NOT NULL UNIQUE,     -- 1, 2, 3, ... (1-300)
      name        TEXT NOT NULL DEFAULT '',    -- misal "Pemilih 001"
      token       TEXT NOT NULL UNIQUE,        -- 8 karakter acak unik
      is_used     INTEGER NOT NULL DEFAULT 0,  -- 0 = belum, 1 = sudah
      used_at     TEXT,                        -- waktu mencoblos
      used_booth  INTEGER,                     -- bilik 1, 2, atau 3
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_voters_token ON voters(token);
    CREATE INDEX IF NOT EXISTS idx_voters_no ON voters(voter_no);
  `);
}

function seed(db: DatabaseSync) {
  // Akun 1,2,3 (token awal NULL -> admin harus membuatkan).
  const accCount = db.prepare('SELECT COUNT(*) AS c FROM accounts').get() as { c: number };
  if (accCount.c === 0) {
    const insert = db.prepare('INSERT INTO accounts (id, label) VALUES (?, ?)');
    insert.run(1, 'Akun 1');
    insert.run(2, 'Akun 2');
    insert.run(3, 'Akun 3');
  }

  // Admin default (username: admin, password: admin123). Salt + hash via crypto.
  const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admin').get() as { c: number };
  if (adminCount.c === 0) {
    const crypto = require('node:crypto') as typeof import('node:crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = crypto.scryptSync('admin123', salt, 64).toString('hex');
    db.prepare(
      'INSERT INTO admin (id, username, password_hash, salt) VALUES (1, ?, ?, ?)'
    ).run('admin', password_hash, salt);
  }

  // Seed scoreboard_state awal (tertutup, belum di-reveal).
  const sbCount = db.prepare('SELECT COUNT(*) AS c FROM scoreboard_state').get() as { c: number };
  if (sbCount.c === 0) {
    db.prepare('INSERT INTO scoreboard_state (id, published, revealed) VALUES (1, 0, 0)').run();
  }

  // Seed settings (logo/maskot kosong dulu; diisi admin nanti saat file dikirim).
  const setCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get() as { c: number };
  if (setCount.c === 0) {
    db.prepare(
      'INSERT INTO settings (id, org_name, org_subtitle, logo_url, mascot_url) VALUES (1, ?, ?, ?, ?)'
    ).run('OSIS', 'Pemilihan Ketua & Wakil Ketua', '', '');
  }

  // Seed rules (panduan pemilos) dengan draf default.
  const rulesCount = db.prepare('SELECT COUNT(*) AS c FROM rules').get() as { c: number };
  if (rulesCount.c === 0) {
    const draft = [
      '1. Pemilihan dilaksanakan secara elektronik melalui 3 akun pemilih yang disediakan pengawas.',
      '2. Setiap akun hanya dapat menjatuhkan satu suara (satu sesi = satu pilihan).',
      '3. Token bersifat rahasia dan hanya diberikan langsung oleh pengawas pemilihan.',
      '4. Pemilih menyalin nomor urut global (Pemilih ke-1, 2, 3, …) yang muncul setelah memilih.',
      '5. Hasil diumumkan secara bertahap (reveal) oleh pengawas melalui scoreboard resmi.',
      '6. Keputusan pengawas bersifat final.',
    ].join('\n');
    db.prepare('INSERT INTO rules (id, headline, body) VALUES (1, ?, ?)').run(
      'Peraturan & Tata Cara Pemilihan',
      draft
    );
  }
}

export function getDb(): DatabaseSync {
  if (globalForDb.__bawaslosDb) return globalForDb.__bawaslosDb;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  createSchema(db);
  seed(db);
  migrate(db);
  globalForDb.__bawaslosDb = db;
  return db;
}

// Migrasi kolom baru secara aman (cek dulu sebelum ALTER).
function migrate(db: DatabaseSync) {
  const cols = db.prepare('PRAGMA table_info(news)').all() as { name: string }[];
  const has = (c: string) => cols.some((x) => x.name === c);
  if (!has('cover_url')) db.prepare('ALTER TABLE news ADD COLUMN cover_url TEXT').run();
  if (!has('featured')) db.prepare('ALTER TABLE news ADD COLUMN featured INTEGER NOT NULL DEFAULT 0').run();
  if (!has('is_new')) db.prepare('ALTER TABLE news ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0').run();

  const sbCols = db.prepare('PRAGMA table_info(scoreboard_state)').all() as { name: string }[];
  const sbHas = (c: string) => sbCols.some((x) => x.name === c);
  if (!sbHas('voting_open')) db.prepare('ALTER TABLE scoreboard_state ADD COLUMN voting_open INTEGER NOT NULL DEFAULT 1').run();

  db.exec(`
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
  `);
}
