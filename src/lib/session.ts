// Manajemen cookie sesi (admin & voter) via next/headers cookies().
import { cookies } from 'next/headers';
import { signAdminSession, verifyAdminSession, signVoterSession, verifyVoterSession } from './auth';
import { getDb } from './db';
import { verifyToken } from './auth';

const ADMIN_COOKIE = 'bawaslos_admin';
const VOTER_COOKIE = 'bawaslos_voter';

export async function adminLogin(username: string, password: string): Promise<boolean> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM admin WHERE id = 1').get() as
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

// Voter login: verifikasi token, set cookie voter (signed plaintext token).
export async function voterLogin(accountId: number, token: string): Promise<boolean> {
  const db = getDb();
  const acc = db
    .prepare('SELECT id, token_hash FROM accounts WHERE id = ?')
    .get(accountId) as { id: number; token_hash: string | null } | undefined;
  if (!acc || !acc.token_hash) return false;
  const [salt, hash] = String(acc.token_hash).includes(':')
    ? String(acc.token_hash).split(':')
    : ['', acc.token_hash];
  if (!verifyToken(token, hash, salt)) return false;
  const cookieStore = await cookies();
  cookieStore.set(VOTER_COOKIE, signVoterSession(token), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 jam cukup untuk satu kali memilih
  });
  return true;
}

export async function voterLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE);
}

// Mengembalikan accountId dari cookie voter, atau null.
export async function currentVoterAccount(): Promise<number | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(VOTER_COOKIE)?.value;
  if (!signed) return null;
  const plain = verifyVoterSession(signed);
  if (!plain) return null;
  const db = getDb();
  const acc = db.prepare('SELECT id, token_hash FROM accounts').all() as {
    id: number;
    token_hash: string | null;
  }[];
  for (const a of acc) {
    if (!a.token_hash) continue;
    const [salt, hash] = String(a.token_hash).includes(':')
      ? String(a.token_hash).split(':')
      : ['', a.token_hash];
    if (verifyToken(plain, hash, salt)) return a.id;
  }
  return null;
}
