// Helper kriptografi & token — murni Node crypto (gratis, tanpa dependensi).
import crypto from 'node:crypto';

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function makeSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Hash token voter (tidak bisa dibalik). Menggunakan scrypt + salt acak.
export function hashToken(token: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(token, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyToken(token: string, hash: string, salt: string): boolean {
  const candidate = crypto.scryptSync(token, salt, 64).toString('hex');
  // bandingkan secara konstan untuk menghindari timing attack
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Token voter: 16 karakter alfanumerik aman (mudah diketik di layar pemilih).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // hindari karakter mirip (0/O,1/I)
export function generateToken(): string {
  let out = '';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Sesi admin disimpan di cookie terenkripsi (signed). Kunci dari env atau default dev.
function sessionSecret(): string {
  return process.env.BAWASLOS_SECRET || 'bawaslos-dev-secret-jangan-pakai-di-produksi';
}

// Buat token sesi admin (signed). Format: <random>.<signature>
export function signAdminSession(): string {
  const payload = crypto.randomBytes(24).toString('hex');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminSession(token: string): boolean {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// Sesi voter disimpan juga sebagai token bertanda (signed) di cookie.
export function signVoterSession(tokenPlain: string): string {
  const sig = crypto.createHmac('sha256', sessionSecret()).update(tokenPlain).digest('hex');
  return `${tokenPlain}.${sig}`;
}

export function verifyVoterSession(signed: string): string | null {
  const [tokenPlain, sig] = signed.split('.');
  if (!tokenPlain || !sig) return null;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(tokenPlain).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return tokenPlain;
}
