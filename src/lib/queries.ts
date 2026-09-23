// Semua akses data & logika inti voting. Dipakai oleh Server Actions & route handlers.
import { getDb } from './db';
import { hashToken, verifyToken, generateToken } from './auth';

// node:sqlite mengembalikan row sebagai object dengan null prototype.
// Next tidak bisa menserialisasi itu ke Client Component, jadi kita
// konversi ke plain object di semua fungsi yang mengembalikan data ke UI.
function plain<T>(rows: T[]): T[] {
  return rows.map((r) => ({ ...(r as object) })) as T[];
}
function plainOne<T>(row: T | undefined): T | undefined {
  return row ? ({ ...(row as object) } as T) : row;
}

export type Pair = {
  id: number;
  number: number;
  chair_name: string;
  vice_name: string;
  vision: string;
  photo_url: string;
  active: number;
};

export type NewsItem = {
  id: number;
  title: string;
  body: string;
  cover_url: string | null;
  featured: number;
  is_new: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: number;
  label: string;
  token_hint: string | null;
  has_token: boolean;
};

export type VoteRow = {
  id: number;
  voter_no: number;
  account_id: number;
  pair_id: number;
  created_at: string;
};

export type VoterRecord = {
  id: number;
  voter_no: number;
  name: string;
  token: string;
  is_used: number;
  used_at: string | null;
  used_booth: number | null;
  created_at: string;
};

// ---------- ACCOUNTS ----------
export function listAccounts(): Account[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, label, token_hint, token_hash FROM accounts ORDER BY id')
    .all() as { id: number; label: string; token_hint: string | null; token_hash: string | null }[];
  return plain(
    rows.map((r) => ({
      id: r.id,
      label: r.label,
      token_hint: r.token_hint,
      has_token: !!r.token_hash,
    }))
  );
}

export function getAccountWithToken(accountId: number) {
  const db = getDb();
  return db
    .prepare('SELECT id, label, token_hash, token_hint FROM accounts WHERE id = ?')
    .get(accountId) as
    | { id: number; label: string; token_hash: string | null; token_hint: string | null }
    | undefined;
}

// Admin membuat/mengganti token untuk sebuah akun. Mengembalikan token PLAIN
// (hanya sekali tampil di layar admin).
export function setAccountToken(accountId: number): string {
  const db = getDb();
  const plain = generateToken(8);
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  // token_hash menyimpan "salt:hash"; token_hint hanya 4 digit awal untuk konfirmasi admin.
  db.prepare('UPDATE accounts SET token_hash = ?, token_hint = ? WHERE id = ?').run(
    salt + ':' + hash,
    plain.slice(0, 4),
    accountId
  );
  // Catat audit
  audit('TOKEN_RESET', `Token akun ${accountId} dibuat ulang`, accountId);
  return plain;
}

// Verifikasi login voter: cocokkan token dengan akun, tandai sesi.
// Mengembalikan { ok, accountId } atau { ok:false }.
export function loginVoter(accountId: number, token: string): { ok: boolean; accountId?: number } {
  const acc = getAccountWithToken(accountId);
  if (!acc || !acc.token_hash) return { ok: false };
  const [salt, hash] = String(acc.token_hash || '').includes(':')
    ? String(acc.token_hash).split(':')
    : ['', acc.token_hash || ''];
  if (!verifyToken(token, hash, salt)) return { ok: false };
  return { ok: true, accountId };
}

// ---------- PAIRS ----------
export function listPairs(activeOnly = false): Pair[] {
  const db = getDb();
  const sql = activeOnly
    ? 'SELECT * FROM pairs WHERE active = 1 ORDER BY number'
    : 'SELECT * FROM pairs ORDER BY number';
  return plain(db.prepare(sql).all() as Pair[]);
}

export function getPair(id: number): Pair | undefined {
  const db = getDb();
  return plainOne(db.prepare('SELECT * FROM pairs WHERE id = ?').get(id) as Pair | undefined);
}

export function upsertPair(p: Partial<Pair> & { number: number }) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM pairs WHERE number = ?').get(p.number) as
    | { id: number }
    | undefined;
  if (existing) {
    db.prepare(
      `UPDATE pairs SET chair_name=?, vice_name=?, vision=?, photo_url=?, active=? WHERE id=?`
    ).run(
      p.chair_name ?? '',
      p.vice_name ?? '',
      p.vision ?? '',
      p.photo_url ?? '',
      p.active ?? 1,
      existing.id
    );
    return existing.id;
  }
  const res = db
    .prepare(
      `INSERT INTO pairs (number, chair_name, vice_name, vision, photo_url, active)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      p.number,
      p.chair_name ?? '',
      p.vice_name ?? '',
      p.vision ?? '',
      p.photo_url ?? '',
      p.active ?? 1
    );
  return Number(res.lastInsertRowid);
}

export function deletePair(id: number) {
  getDb().prepare('DELETE FROM pairs WHERE id = ?').run(id);
}

// ---------- NEWS ----------
export function listNews(publishedOnly = false): NewsItem[] {
  const db = getDb();
  const sql = publishedOnly
    ? 'SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC'
    : 'SELECT * FROM news ORDER BY created_at DESC';
  return plain(db.prepare(sql).all() as NewsItem[]);
}

export function getNews(id: number): NewsItem | undefined {
  const db = getDb();
  return plainOne(db.prepare('SELECT * FROM news WHERE id = ?').get(id) as NewsItem | undefined);
}

export function upsertNews(n: Partial<NewsItem> & { title: string; body: string }) {
  const db = getDb();
  const cover = n.cover_url ?? null;
  const featured = n.featured ?? 0;
  const isNew = n.is_new ?? 0;
  if (n.id) {
    db.prepare('UPDATE news SET title=?, body=?, cover_url=?, featured=?, is_new=?, published=?, updated_at=datetime(\'now\') WHERE id=?').run(
      n.title,
      n.body,
      cover,
      featured,
      isNew,
      n.published ?? 1,
      n.id
    );
    return n.id;
  }
  const res = db
    .prepare('INSERT INTO news (title, body, cover_url, featured, is_new, published) VALUES (?, ?, ?, ?, ?, ?)')
    .run(n.title, n.body, cover, featured, isNew, n.published ?? 1);
  return Number(res.lastInsertRowid);
}

export function deleteNews(id: number) {
  getDb().prepare('DELETE FROM news WHERE id = ?').run(id);
}

// ---------- VOTES (logika inti) ----------
// Menjatuhkan satu suara. Nomor urut GLOBAL diambil dari MAX(voter_no)+1,
// sehingga Pemilih 1,2,3,... terus naik LINTAS akun.
export function castVote(accountId: number, pairId: number, voterId?: number): { voter_no: number } {
  const db = getDb();
  // node:sqlite tidak punya wrapper .transaction(); pakai BEGIN/COMMIT manual
  // agar pengambilan nomor urut & insert atomik (tidak ada nomor kembar).
  db.exec('BEGIN');
  try {
    const maxRow = db.prepare('SELECT COALESCE(MAX(voter_no),0) AS m FROM votes').get() as {
      m: number;
    };
    const nextNo = maxRow.m + 1;
    db.prepare('INSERT INTO votes (voter_no, account_id, pair_id) VALUES (?, ?, ?)').run(
      nextNo,
      accountId,
      pairId
    );
    // Hancurkan token akun agar tidak bisa digunakan kembali (single-use token)
    db.prepare('UPDATE accounts SET token_hash = NULL, token_hint = NULL WHERE id = ?').run(accountId);
    db.prepare('DELETE FROM voter_sessions WHERE account_id = ?').run(accountId);

    // Jika pemilih menggunakan token DPT / massal, tandai sudah memilih
    if (voterId) {
      db.prepare('UPDATE voters SET is_used = 1, used_at = datetime(\'now\'), used_booth = ? WHERE id = ?').run(
        accountId,
        voterId
      );
    }

    audit('VOTE', `Pemilih ke-${nextNo} dari Bilik ${accountId} memilih pasangan ${pairId}`, accountId);
    db.exec('COMMIT');
    return { voter_no: nextNo };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function totalVotes(): number {
  return (getDb().prepare('SELECT COUNT(*) AS c FROM votes').get() as { c: number }).c;
}

// Rekap suara per pasangan (untuk scoreboard).
export function tally(): { pair_id: number; number: number; chair_name: string; vice_name: string; photo_url: string; votes: number }[] {
  const db = getDb();
  return plain(
    db
      .prepare(
        `SELECT p.id AS pair_id, p.number, p.chair_name, p.vice_name, p.photo_url,
              COALESCE((SELECT COUNT(*) FROM votes v WHERE v.pair_id = p.id),0) AS votes
       FROM pairs p
       ORDER BY p.number`
      )
      .all() as { pair_id: number; number: number; chair_name: string; vice_name: string; photo_url: string; votes: number }[]
  );
}

// Rekap perolehan suara terungkap secara aman (hanya agregasi per paslon, tanpa data pemilih individual)
export function revealedTally(revealedCount: number): { pair_id: number; number: number; chair_name: string; vice_name: string; photo_url: string; votes: number }[] {
  const db = getDb();
  return plain(
    db
      .prepare(
        `SELECT p.id AS pair_id, p.number, p.chair_name, p.vice_name, p.photo_url,
              COALESCE((
                SELECT COUNT(*) FROM (
                  SELECT pair_id FROM votes ORDER BY voter_no ASC LIMIT ?
                ) v WHERE v.pair_id = p.id
              ),0) AS votes
       FROM pairs p
       ORDER BY p.number`
      )
      .all(Math.max(0, revealedCount)) as { pair_id: number; number: number; chair_name: string; vice_name: string; photo_url: string; votes: number }[]
  );
}

// Seluruh suara berurutan (untuk audit internal / verifikasi admin).
export function voteTimeline(): VoteRow[] {
  const db = getDb();
  return plain(
    db.prepare('SELECT * FROM votes ORDER BY voter_no ASC').all() as VoteRow[]
  );
}

// Audit per akun: berapa suara dari akun 1/2/3.
export function votesByAccount(): { account_id: number; count: number }[] {
  const db = getDb();
  return plain(
    db
      .prepare('SELECT account_id, COUNT(*) AS count FROM votes GROUP BY account_id ORDER BY account_id')
      .all() as { account_id: number; count: number }[]
  );
}

export function audit(action: string, detail: string, accountId?: number) {
  getDb()
    .prepare('INSERT INTO audit (action, detail, account_id) VALUES (?, ?, ?)')
    .run(action, detail, accountId ?? null);
}

export function listAudit(): { id: number; action: string; detail: string; account_id: number | null; created_at: string }[] {
  const db = getDb();
  return plain(
    db
      .prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200')
      .all() as { id: number; action: string; detail: string; account_id: number | null; created_at: string }[]
  );
}

// Reset: hapus semua suara & sesi voter (AKUN & TOKEN tetap ada).
export function resetVotes() {
  const db = getDb();
  db.prepare('DELETE FROM votes').run();
  db.prepare('DELETE FROM voter_sessions').run();
  db.prepare('UPDATE scoreboard_state SET revealed = 0').run();
  audit('RESET', 'Seluruh suara direset');
}

// ---------- SCOREBOARD STATE (dikendalikan admin) ----------
export type ScoreboardState = { published: boolean; revealed: number; total: number };

export function getScoreboardState(): ScoreboardState {
  const db = getDb();
  const row = db.prepare('SELECT published, revealed FROM scoreboard_state WHERE id = 1').get() as {
    published: number;
    revealed: number;
  };
  const total = (db.prepare('SELECT COUNT(*) AS c FROM votes').get() as { c: number }).c;
  return { published: !!row.published, revealed: Math.min(row.revealed, total), total };
}

export function setScoreboardPublished(published: boolean) {
  getDb().prepare('UPDATE scoreboard_state SET published = ?').run(published ? 1 : 0);
}

export function setScoreboardRevealed(revealed: number) {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) AS c FROM votes').get() as { c: number }).c;
  const r = Math.max(0, Math.min(revealed, total));
  db.prepare('UPDATE scoreboard_state SET revealed = ?').run(r);
}

// ---------- VOTING STATE (dikendalikan admin) ----------
export function getVotingOpen(): boolean {
  const db = getDb();
  const row = db.prepare('SELECT voting_open FROM scoreboard_state WHERE id = 1').get() as
    | { voting_open: number }
    | undefined;
  return row ? !!row.voting_open : true;
}

export function setVotingOpen(open: boolean) {
  getDb().prepare('UPDATE scoreboard_state SET voting_open = ?').run(open ? 1 : 0);
  audit(open ? 'VOTING_OPEN' : 'VOTING_CLOSE', open ? 'Voting dibuka' : 'Voting ditutup');
}

// ---------- SETTINGS (logo / maskot / org) ----------
export type Settings = {
  org_name: string;
  org_subtitle: string;
  logo_url: string;
  mascot_url: string;
};

export function getSettings(): Settings {
  const db = getDb();
  return (
    plainOne(
      db
        .prepare('SELECT org_name, org_subtitle, logo_url, mascot_url FROM settings WHERE id = 1')
        .get() as Settings
    ) ?? { org_name: 'OSIS', org_subtitle: 'Pemilihan Ketua & Wakil Ketua', logo_url: '', mascot_url: '' }
  );
}

export function saveSettings(s: Partial<Settings>) {
  const db = getDb();
  const cur = getSettings();
  db.prepare(
    'UPDATE settings SET org_name = ?, org_subtitle = ?, logo_url = ?, mascot_url = ? WHERE id = 1'
  ).run(
    s.org_name ?? cur.org_name,
    s.org_subtitle ?? cur.org_subtitle,
    s.logo_url ?? cur.logo_url,
    s.mascot_url ?? cur.mascot_url
  );
}

// ---------- RULES (panduan pemilos) ----------
export type Rules = { headline: string; body: string };

export function getRules(): Rules {
  const db = getDb();
  return (
    plainOne(db.prepare('SELECT headline, body FROM rules WHERE id = 1').get() as Rules) ?? {
      headline: 'Peraturan & Tata Cara Pemilihan',
      body: '',
    }
  );
}

export function saveRules(headline: string, body: string) {
  getDb().prepare('UPDATE rules SET headline = ?, body = ? WHERE id = 1').run(headline, body);
}

// ---------- DAFTAR PEMILIH TETAP / TOKEN MASSAL (1-300 dst) ----------

export function generateVotersBatch(fromNo: number, toNo: number): { count: number; start: number; end: number } {
  const db = getDb();
  const start = Math.max(1, Math.floor(fromNo));
  const end = Math.max(start, Math.floor(toNo));
  db.exec('BEGIN');
  try {
    const insert = db.prepare(`
      INSERT INTO voters (voter_no, name, token, is_used, used_at, used_booth)
      VALUES (?, ?, ?, 0, NULL, NULL)
      ON CONFLICT(voter_no) DO UPDATE SET
        token = excluded.token,
        is_used = 0,
        used_at = NULL,
        used_booth = NULL
    `);
    let count = 0;
    for (let n = start; n <= end; n++) {
      const token = generateToken(8);
      const padNo = String(n).padStart(3, '0');
      const name = `Pemilih ${padNo}`;
      insert.run(n, name, token);
      count++;
    }
    audit('VOTERS_GENERATED', `Generate ${count} token pemilih (No. Urut ${start} - ${end})`);
    db.exec('COMMIT');
    return { count, start, end };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function listVoters(options?: {
  filter?: 'all' | 'used' | 'unused';
  search?: string;
  limit?: number;
  offset?: number;
}): { voters: VoterRecord[]; total: number; used: number; unused: number } {
  const db = getDb();
  const filter = options?.filter || 'all';
  const search = options?.search ? options.search.trim() : '';
  const limit = options?.limit ?? 1000;
  const offset = options?.offset ?? 0;

  const statRow = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS used
    FROM voters
  `).get() as { total: number; used: number };

  const total = statRow.total;
  const used = statRow.used;
  const unused = total - used;

  let query = 'SELECT * FROM voters WHERE 1=1';
  const params: (string | number)[] = [];

  if (filter === 'used') {
    query += ' AND is_used = 1';
  } else if (filter === 'unused') {
    query += ' AND is_used = 0';
  }

  if (search) {
    query += ' AND (voter_no = ? OR token LIKE ? OR name LIKE ?)';
    const numSearch = Number(search) || -1;
    params.push(numSearch, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY voter_no ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const voters = plain(db.prepare(query).all(...params) as VoterRecord[]);
  return { voters, total, used, unused };
}

export function getVoterByToken(token: string): VoterRecord | undefined {
  const db = getDb();
  const clean = token.trim().toUpperCase();
  return plainOne(db.prepare('SELECT * FROM voters WHERE UPPER(token) = ?').get(clean) as VoterRecord | undefined);
}

export function getVoterById(id: number): VoterRecord | undefined {
  const db = getDb();
  return plainOne(db.prepare('SELECT * FROM voters WHERE id = ?').get(id) as VoterRecord | undefined);
}

export function getVotersStats(): { total: number; used: number; unused: number; turnout: number } {
  const db = getDb();
  const stat = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS used
    FROM voters
  `).get() as { total: number; used: number };
  const total = stat.total;
  const used = stat.used;
  const unused = total - used;
  const turnout = total > 0 ? Math.round((used / total) * 100) : 0;
  return { total, used, unused, turnout };
}

export function resetAllVoters(): void {
  const db = getDb();
  db.prepare('DELETE FROM voters').run();
  audit('VOTERS_RESET', 'Seluruh data token pemilih massal dihapus');
}
