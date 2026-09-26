// Semua akses data & logika inti voting. Dipakai oleh Server Actions & route handlers.
import { ensureDb } from './db';
import { verifyToken, generateToken } from './auth';

function plain<T>(rows: T[]): T[] {
  return rows.map((r) => ({ ...(r as object) })) as T[];
}
function plainOne<T>(row: T | undefined): T | undefined {
  return row ? ({ ...(row as object) } as T) : undefined;
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
export async function listAccounts(): Promise<Account[]> {
  const db = await ensureDb();
  const res = await db.execute('SELECT id, label, token_hint, token_hash FROM accounts ORDER BY id');
  return res.rows.map((r) => ({
    id: Number(r.id),
    label: String(r.label),
    token_hint: r.token_hint ? String(r.token_hint) : null,
    has_token: !!r.token_hash,
  }));
}

export async function getAccountWithToken(accountId: number) {
  const db = await ensureDb();
  const res = await db.execute({
    sql: 'SELECT id, label, token_hash, token_hint FROM accounts WHERE id = ?',
    args: [accountId],
  });
  return plainOne(res.rows[0]) as
    | { id: number; label: string; token_hash: string | null; token_hint: string | null }
    | undefined;
}

// Admin membuat/mengganti token untuk sebuah akun. Mengembalikan token PLAIN
// (hanya sekali tampil di layar admin).
export async function setAccountToken(accountId: number): Promise<string> {
  const db = await ensureDb();
  const plainToken = generateToken(8);
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainToken, salt, 64).toString('hex');
  // token_hash menyimpan "salt:hash"; token_hint hanya 4 digit awal untuk konfirmasi admin.
  await db.execute({
    sql: 'UPDATE accounts SET token_hash = ?, token_hint = ? WHERE id = ?',
    args: [salt + ':' + hash, plainToken.slice(0, 4), accountId],
  });
  // Catat audit
  await audit('TOKEN_RESET', `Token akun ${accountId} dibuat ulang`, accountId);
  return plainToken;
}

// Verifikasi login voter: cocokkan token dengan akun, tandai sesi.
// Mengembalikan { ok, accountId } atau { ok:false }.
export async function loginVoter(accountId: number, token: string): Promise<{ ok: boolean; accountId?: number }> {
  const acc = await getAccountWithToken(accountId);
  if (!acc || !acc.token_hash) return { ok: false };
  const [salt, hash] = String(acc.token_hash || '').includes(':')
    ? String(acc.token_hash).split(':')
    : ['', acc.token_hash || ''];
  if (!verifyToken(token, hash, salt)) return { ok: false };
  return { ok: true, accountId };
}

// ---------- PAIRS ----------
export async function listPairs(activeOnly = false): Promise<Pair[]> {
  const db = await ensureDb();
  const sql = activeOnly
    ? 'SELECT * FROM pairs WHERE active = 1 ORDER BY number'
    : 'SELECT * FROM pairs ORDER BY number';
  const res = await db.execute(sql);
  return plain(res.rows as unknown as Pair[]);
}

export async function getPair(id: number): Promise<Pair | undefined> {
  const db = await ensureDb();
  const res = await db.execute({ sql: 'SELECT * FROM pairs WHERE id = ?', args: [id] });
  return plainOne(res.rows[0] as unknown as Pair | undefined);
}

export async function upsertPair(p: Partial<Pair> & { number: number }): Promise<number> {
  const db = await ensureDb();
  const existingRes = await db.execute({
    sql: 'SELECT id FROM pairs WHERE number = ?',
    args: [p.number],
  });
  const existing = existingRes.rows[0];
  if (existing) {
    await db.execute({
      sql: `UPDATE pairs SET chair_name=?, vice_name=?, vision=?, photo_url=?, active=? WHERE id=?`,
      args: [
        p.chair_name ?? '',
        p.vice_name ?? '',
        p.vision ?? '',
        p.photo_url ?? '',
        p.active ?? 1,
        existing.id,
      ],
    });
    return Number(existing.id);
  }
  const res = await db.execute({
    sql: `INSERT INTO pairs (number, chair_name, vice_name, vision, photo_url, active) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      p.number,
      p.chair_name ?? '',
      p.vice_name ?? '',
      p.vision ?? '',
      p.photo_url ?? '',
      p.active ?? 1,
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function deletePair(id: number): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: 'DELETE FROM pairs WHERE id = ?', args: [id] });
}

// ---------- NEWS ----------
export async function listNews(publishedOnly = false): Promise<NewsItem[]> {
  const db = await ensureDb();
  const sql = publishedOnly
    ? 'SELECT * FROM news WHERE published = 1 ORDER BY created_at DESC'
    : 'SELECT * FROM news ORDER BY created_at DESC';
  const res = await db.execute(sql);
  return plain(res.rows as unknown as NewsItem[]);
}

export async function getNews(id: number): Promise<NewsItem | undefined> {
  const db = await ensureDb();
  const res = await db.execute({ sql: 'SELECT * FROM news WHERE id = ?', args: [id] });
  return plainOne(res.rows[0] as unknown as NewsItem | undefined);
}

export async function upsertNews(n: Partial<NewsItem> & { title: string; body: string }): Promise<number> {
  const db = await ensureDb();
  const cover = n.cover_url ?? null;
  const featured = n.featured ?? 0;
  const isNew = n.is_new ?? 0;
  if (n.id) {
    await db.execute({
      sql: `UPDATE news SET title=?, body=?, cover_url=?, featured=?, is_new=?, published=?, updated_at=datetime('now') WHERE id=?`,
      args: [n.title, n.body, cover, featured, isNew, n.published ?? 1, n.id],
    });
    return n.id;
  }
  const res = await db.execute({
    sql: `INSERT INTO news (title, body, cover_url, featured, is_new, published) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [n.title, n.body, cover, featured, isNew, n.published ?? 1],
  });
  return Number(res.lastInsertRowid);
}

export async function deleteNews(id: number): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: 'DELETE FROM news WHERE id = ?', args: [id] });
}

// ---------- VOTES (logika inti) ----------
export async function castVote(accountId: number, pairId: number, voterId?: number): Promise<{ voter_no: number }> {
  const db = await ensureDb();
  const tx = await db.transaction('write');
  try {
    // Validasi ganda jika token pemilih massal (DPT): pastikan belum digunakan sama sekali
    if (voterId) {
      const check = await tx.execute({
        sql: 'SELECT is_used FROM voters WHERE id = ?',
        args: [voterId],
      });
      const isUsed = Number(check.rows[0]?.is_used ?? 1);
      if (isUsed === 1) {
        throw new Error('Hak suara untuk token ini sudah digunakan sebelumnya.');
      }
    }

    const maxRow = (await tx.execute('SELECT COALESCE(MAX(voter_no),0) AS m FROM votes')).rows[0] as unknown as { m: number };
    const nextNo = Number(maxRow.m) + 1;

    await tx.execute({
      sql: 'INSERT INTO votes (voter_no, account_id, pair_id) VALUES (?, ?, ?)',
      args: [nextNo, accountId, pairId],
    });

    // Hancurkan token akun agar tidak bisa digunakan kembali (single-use token)
    await tx.execute({
      sql: 'UPDATE accounts SET token_hash = NULL, token_hint = NULL WHERE id = ?',
      args: [accountId],
    });
    await tx.execute({
      sql: 'DELETE FROM voter_sessions WHERE account_id = ?',
      args: [accountId],
    });

    // Jika pemilih menggunakan token DPT / massal, tandai sudah memilih secara atomik
    if (voterId) {
      await tx.execute({
        sql: `UPDATE voters SET is_used = 1, used_at = datetime('now'), used_booth = ? WHERE id = ? AND is_used = 0`,
        args: [accountId, voterId],
      });
    }

    await tx.execute({
      sql: 'INSERT INTO audit (action, detail, account_id) VALUES (?, ?, ?)',
      args: ['VOTE', `Pemilih ke-${nextNo} dari Bilik ${accountId} memilih pasangan ${pairId}`, accountId],
    });

    await tx.commit();
    return { voter_no: nextNo };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function totalVotes(): Promise<number> {
  const db = await ensureDb();
  const res = await db.execute('SELECT COUNT(*) AS c FROM votes');
  return Number(res.rows[0].c);
}

// Rekap suara per pasangan (untuk scoreboard).
export async function tally(): Promise<{ pair_id: number; number: number; chair_name: string; vice_name: string; photo_url: string; votes: number }[]> {
  const db = await ensureDb();
  const res = await db.execute(`
    SELECT p.id AS pair_id, p.number, p.chair_name, p.vice_name, p.photo_url,
          COALESCE((SELECT COUNT(*) FROM votes v WHERE v.pair_id = p.id),0) AS votes
    FROM pairs p
    ORDER BY p.number
  `);
  return plain(
    res.rows.map((r) => ({
      pair_id: Number(r.pair_id),
      number: Number(r.number),
      chair_name: String(r.chair_name),
      vice_name: String(r.vice_name),
      photo_url: String(r.photo_url || ''),
      votes: Number(r.votes),
    }))
  );
}

// Rekap perolehan suara terungkap secara aman (hanya agregasi per paslon, tanpa data pemilih individual)
export async function revealedTally(revealedCount: number): Promise<{ pair_id: number; number: number; chair_name: string; vice_name: string; photo_url: string; votes: number }[]> {
  const db = await ensureDb();
  const res = await db.execute({
    sql: `
      SELECT p.id AS pair_id, p.number, p.chair_name, p.vice_name, p.photo_url,
            COALESCE((
              SELECT COUNT(*) FROM (
                SELECT pair_id FROM votes ORDER BY voter_no ASC LIMIT ?
              ) v WHERE v.pair_id = p.id
            ),0) AS votes
      FROM pairs p
      ORDER BY p.number
    `,
    args: [Math.max(0, revealedCount)],
  });
  return plain(
    res.rows.map((r) => ({
      pair_id: Number(r.pair_id),
      number: Number(r.number),
      chair_name: String(r.chair_name),
      vice_name: String(r.vice_name),
      photo_url: String(r.photo_url || ''),
      votes: Number(r.votes),
    }))
  );
}

// Seluruh suara berurutan (untuk audit internal / verifikasi admin).
export async function voteTimeline(): Promise<VoteRow[]> {
  const db = await ensureDb();
  const res = await db.execute('SELECT * FROM votes ORDER BY voter_no ASC');
  return plain(res.rows as unknown as VoteRow[]);
}

// Audit per akun: berapa suara dari akun 1/2/3.
export async function votesByAccount(): Promise<{ account_id: number; count: number }[]> {
  const db = await ensureDb();
  const res = await db.execute('SELECT account_id, COUNT(*) AS count FROM votes GROUP BY account_id ORDER BY account_id');
  return plain(
    res.rows.map((r) => ({
      account_id: Number(r.account_id),
      count: Number(r.count),
    }))
  );
}

export async function audit(action: string, detail: string, accountId?: number): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: 'INSERT INTO audit (action, detail, account_id) VALUES (?, ?, ?)',
    args: [action, detail, accountId ?? null],
  });
}

export async function listAudit(): Promise<{ id: number; action: string; detail: string; account_id: number | null; created_at: string }[]> {
  const db = await ensureDb();
  const res = await db.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 200');
  return res.rows.map((r) => ({
    id: Number(r.id),
    action: String(r.action),
    detail: String(r.detail || ''),
    account_id: r.account_id !== null && r.account_id !== undefined ? Number(r.account_id) : null,
    created_at: String(r.created_at),
  }));
}

// Reset: hapus semua suara & sesi voter (AKUN & TOKEN tetap ada).
export async function resetVotes(): Promise<void> {
  const db = await ensureDb();
  await db.execute('DELETE FROM votes');
  await db.execute('DELETE FROM voter_sessions');
  await db.execute('UPDATE scoreboard_state SET revealed = 0');
  await audit('RESET', 'Seluruh suara direset');
}

// ---------- SCOREBOARD STATE (dikendalikan admin) ----------
export type ScoreboardState = { published: boolean; revealed: number; total: number };

export async function getScoreboardState(): Promise<ScoreboardState> {
  const db = await ensureDb();
  const rowRes = await db.execute('SELECT published, revealed FROM scoreboard_state WHERE id = 1');
  const row = rowRes.rows[0];
  const totalRes = await db.execute('SELECT COUNT(*) AS c FROM votes');
  const total = Number(totalRes.rows[0].c);
  const revealed = Number(row?.revealed ?? 0);
  return { published: !!row?.published, revealed: Math.min(revealed, total), total };
}

export async function setScoreboardPublished(published: boolean): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: 'UPDATE scoreboard_state SET published = ? WHERE id = 1',
    args: [published ? 1 : 0],
  });
}

export async function setScoreboardRevealed(revealed: number): Promise<void> {
  const db = await ensureDb();
  const totalRes = await db.execute('SELECT COUNT(*) AS c FROM votes');
  const total = Number(totalRes.rows[0].c);
  const r = Math.max(0, Math.min(revealed, total));
  await db.execute({
    sql: 'UPDATE scoreboard_state SET revealed = ? WHERE id = 1',
    args: [r],
  });
}

// ---------- VOTING STATE (dikendalikan admin) ----------
export async function getVotingOpen(): Promise<boolean> {
  const db = await ensureDb();
  const res = await db.execute('SELECT voting_open FROM scoreboard_state WHERE id = 1');
  const row = res.rows[0];
  return row ? !!row.voting_open : true;
}

export async function setVotingOpen(open: boolean): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: 'UPDATE scoreboard_state SET voting_open = ? WHERE id = 1',
    args: [open ? 1 : 0],
  });
  await audit(open ? 'VOTING_OPEN' : 'VOTING_CLOSE', open ? 'Voting dibuka' : 'Voting ditutup');
}

// ---------- SETTINGS (logo / maskot / org) ----------
export type Settings = {
  org_name: string;
  org_subtitle: string;
  logo_url: string;
  mascot_url: string;
};

export async function getSettings(): Promise<Settings> {
  const db = await ensureDb();
  const res = await db.execute('SELECT org_name, org_subtitle, logo_url, mascot_url FROM settings WHERE id = 1');
  const row = plainOne(res.rows[0] as unknown as Settings | undefined);
  return {
    org_name: row?.org_name || 'BAWASLOS',
    org_subtitle: row?.org_subtitle || 'Badan Pengawas Pemilihan Osis — SMK Negeri 64 Jakarta',
    logo_url: row?.logo_url || '/logo.png',
    mascot_url: row?.mascot_url || '/maskot.png',
  };
}

export async function saveSettings(s: Partial<Settings>): Promise<void> {
  const db = await ensureDb();
  const cur = await getSettings();
  await db.execute({
    sql: 'UPDATE settings SET org_name = ?, org_subtitle = ?, logo_url = ?, mascot_url = ? WHERE id = 1',
    args: [
      s.org_name !== undefined && s.org_name.trim() !== '' ? s.org_name : cur.org_name,
      s.org_subtitle !== undefined && s.org_subtitle.trim() !== '' ? s.org_subtitle : cur.org_subtitle,
      s.logo_url !== undefined && s.logo_url.trim() !== '' ? s.logo_url : cur.logo_url,
      s.mascot_url !== undefined && s.mascot_url.trim() !== '' ? s.mascot_url : cur.mascot_url,
    ],
  });
}

// ---------- RULES (panduan pemilos) ----------
export type Rules = { headline: string; body: string };

export async function getRules(): Promise<Rules> {
  const db = await ensureDb();
  const res = await db.execute('SELECT headline, body FROM rules WHERE id = 1');
  return (
    plainOne(res.rows[0] as unknown as Rules | undefined) ?? {
      headline: 'Peraturan & Tata Cara Pemilihan',
      body: '',
    }
  );
}

export async function saveRules(headline: string, body: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: 'UPDATE rules SET headline = ?, body = ? WHERE id = 1',
    args: [headline, body],
  });
}

// ---------- DAFTAR PEMILIH TETAP / TOKEN MASSAL (1-300 dst) ----------
export async function generateVotersBatch(fromNo: number, toNo: number): Promise<{ count: number; start: number; end: number }> {
  const db = await ensureDb();
  const start = Math.max(1, Math.floor(fromNo));
  const end = Math.max(start, Math.floor(toNo));

  // Gunakan multi-row INSERT dalam batch (chunk 50 baris per query)
  // agar sangat cepat di cloud Turso dan tidak terkena timeout Vercel (10 detik limit).
  const CHUNK_SIZE = 50;
  let count = 0;

  for (let current = start; current <= end; current += CHUNK_SIZE) {
    const chunkEnd = Math.min(current + CHUNK_SIZE - 1, end);
    const valuePlaceholders: string[] = [];
    const params: (string | number)[] = [];

    for (let n = current; n <= chunkEnd; n++) {
      const token = generateToken(8);
      const padNo = String(n).padStart(3, '0');
      const name = `Pemilih ${padNo}`;
      valuePlaceholders.push('(?, ?, ?, 0, NULL, NULL)');
      params.push(n, name, token);
      count++;
    }

    const sql = `
      INSERT INTO voters (voter_no, name, token, is_used, used_at, used_booth)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT(voter_no) DO UPDATE SET
        token = excluded.token,
        is_used = 0,
        used_at = NULL,
        used_booth = NULL
    `;

    await db.execute({ sql, args: params });
  }

  await audit('VOTERS_GENERATED', `Generate ${count} token pemilih (No. Urut ${start} - ${end})`);
  return { count, start, end };
}

export async function listVoters(options?: {
  filter?: 'all' | 'used' | 'unused';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ voters: VoterRecord[]; total: number; used: number; unused: number }> {
  const db = await ensureDb();
  const filter = options?.filter || 'all';
  const search = options?.search ? options.search.trim() : '';
  const limit = options?.limit ?? 1000;
  const offset = options?.offset ?? 0;

  const statRes = await db.execute(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS used
    FROM voters
  `);
  const statRow = statRes.rows[0];
  const total = Number(statRow?.total ?? 0);
  const used = Number(statRow?.used ?? 0);
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

  const res = await db.execute({ sql: query, args: params });
  const voters = plain(res.rows as unknown as VoterRecord[]);
  return { voters, total, used, unused };
}

export async function getVoterByToken(token: string): Promise<VoterRecord | undefined> {
  const db = await ensureDb();
  const clean = token.trim().toUpperCase().replace(/\s+/g, '');
  const res = await db.execute({
    sql: 'SELECT * FROM voters WHERE UPPER(TRIM(token)) = ?',
    args: [clean],
  });
  return plainOne(res.rows[0] as unknown as VoterRecord | undefined);
}

export async function getVoterById(id: number): Promise<VoterRecord | undefined> {
  const db = await ensureDb();
  const res = await db.execute({
    sql: 'SELECT * FROM voters WHERE id = ?',
    args: [id],
  });
  return plainOne(res.rows[0] as unknown as VoterRecord | undefined);
}

export async function getVotersStats(): Promise<{ total: number; used: number; unused: number; turnout: number }> {
  const db = await ensureDb();
  const res = await db.execute(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS used
    FROM voters
  `);
  const stat = res.rows[0];
  const total = Number(stat?.total ?? 0);
  const used = Number(stat?.used ?? 0);
  const unused = total - used;
  const turnout = total > 0 ? Math.round((used / total) * 100) : 0;
  return { total, used, unused, turnout };
}

export async function resetAllVoters(): Promise<void> {
  const db = await ensureDb();
  await db.execute('DELETE FROM voters');
  await audit('VOTERS_RESET', 'Seluruh data token pemilih massal dihapus');
}
