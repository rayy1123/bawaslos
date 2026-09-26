// Manajemen cookie sesi (admin & voter) via next/headers cookies().
import { cookies } from 'next/headers';
import { signAdminSession, verifyAdminSession, signVoterSession, verifyVoterSession } from './auth';
import { ensureDb } from './db';
import { verifyToken } from './auth';
import { getVoterByToken, getVoterById } from './queries';

const ADMIN_COOKIE = 'bawaslos_admin';
const VOTER_COOKIE = 'bawaslos_voter';

export async function adminLogin(username: string, password: string): Promise<boolean> {
  const db = await ensureDb();
  const res = await db.execute({
    sql: 'SELECT * FROM admin WHERE id = 1',
    args: [],
  });
  const row = res.rows[0] as unknown as
    | { username: string; password_hash: string; salt: string }
    | undefined;
  if (!row) return false;
  const candidate = require('node:crypto') as typeof import('node:crypto');
  const hash = candidate.scryptSync(password, row.salt, 64).toString('hex');
  const ok = row.username === username && hash === row.password_hash;
  if (ok) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, signAdminSession(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
  }
  return ok;
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return token ? verifyAdminSession(token) : false;
}

export type ActiveVoter = {
  accountId: number;
  voterId?: number;
  voterNo?: number;
  name?: string;
};

// Voter login: verifikasi token (DPT massal 1-300 atau akun bilik).
export async function voterLogin(
  accountId: number,
  token: string
): Promise<{ ok: boolean; error?: string; voterNo?: number }> {
  const clean = token.trim().toUpperCase().replace(/\s+/g, '');

  // 1. Cek pada daftar pemilih massal / DPT (1-300 dst)
  const voter = await getVoterByToken(clean);
  if (voter) {
    if (voter.is_used === 1) {
      return {
        ok: false,
        error: `Token Pemilih #${voter.voter_no} sudah pernah digunakan pada ${voter.used_at || 'sebelumnya'}.`,
      };
    }
    const cookieStore = await cookies();
    cookieStore.set(VOTER_COOKIE, signVoterSession(`v:${voter.id}:${accountId || 1}`), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });
    return { ok: true, voterNo: voter.voter_no };
  }

  // 2. Fallback: cek akun tetap bilik (Akun 1, 2, 3)
  const db = await ensureDb();
  const accRes = await db.execute({
    sql: 'SELECT id, token_hash FROM accounts WHERE id = ?',
    args: [accountId],
  });
  const acc = accRes.rows[0] as unknown as { id: number; token_hash: string | null } | undefined;
  if (acc && acc.token_hash) {
    const [salt, hash] = String(acc.token_hash).includes(':')
      ? String(acc.token_hash).split(':')
      : ['', acc.token_hash];
    if (verifyToken(clean, hash, salt)) {
      const cookieStore = await cookies();
      cookieStore.set(VOTER_COOKIE, signVoterSession(`acc:${acc.id}`), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      });
      return { ok: true };
    }
  }

  return { ok: false, error: 'Token tidak valid atau belum terdaftar di DPT.' };
}

export async function voterLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE);
}

// Mengambil sesi pemilih aktif (baik dari DPT massal atau akun bilik).
export async function currentVoterSession(): Promise<ActiveVoter | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(VOTER_COOKIE)?.value;
  if (!signed) return null;
  const payload = verifyVoterSession(signed);
  if (!payload) return null;

  // Format DPT: v:{voterId}:{boothId}
  if (payload.startsWith('v:')) {
    const [, idStr, boothStr] = payload.split(':');
    const voterId = Number(idStr);
    const boothId = Number(boothStr) || 1;
    const voter = await getVoterById(voterId);
    if (!voter || voter.is_used === 1) {
      await voterLogout();
      return null;
    }
    return {
      accountId: boothId,
      voterId: voter.id,
      voterNo: voter.voter_no,
      name: voter.name,
    };
  }

  // Format Booth account: acc:{accountId}
  if (payload.startsWith('acc:')) {
    const [, accIdStr] = payload.split(':');
    const accountId = Number(accIdStr);
    return { accountId };
  }

  // Fallback token lama
  const db = await ensureDb();
  const accsRes = await db.execute('SELECT id, token_hash FROM accounts');
  const accs = accsRes.rows as unknown as {
    id: number;
    token_hash: string | null;
  }[];
  for (const a of accs) {
    if (!a.token_hash) continue;
    const [salt, hash] = String(a.token_hash).includes(':')
      ? String(a.token_hash).split(':')
      : ['', a.token_hash];
    if (verifyToken(payload, hash, salt)) return { accountId: a.id };
  }
  return null;
}

// Mengembalikan accountId dari cookie voter, atau null.
export async function currentVoterAccount(): Promise<number | null> {
  const s = await currentVoterSession();
  return s ? s.accountId : null;
}
