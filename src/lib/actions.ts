'use server';

import { revalidatePath } from 'next/cache';
import {
  adminLogin as doAdminLogin,
  adminLogout as doAdminLogout,
  voterLogin as doVoterLogin,
  voterLogout as doVoterLogout,
  isAdmin,
  currentVoterAccount,
  currentVoterSession,
} from './session';
import {
  castVote,
  listAccounts,
  setAccountToken,
  upsertPair,
  deletePair,
  upsertNews,
  deleteNews,
  getNews,
  resetVotes,
  listAudit,
  setScoreboardPublished,
  setScoreboardRevealed,
  saveRules,
  saveSettings,
  setVotingOpen,
  generateVotersBatch,
  resetAllVoters,
  getVotersStats,
} from './queries';
import { hashPassword, makeSalt } from './auth';
import { getDb } from './db';

// ---------------- ADMIN ----------------
export async function adminLoginAction(formData: FormData) {
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');
  const ok = await doAdminLogin(username, password);
  if (ok) {
    revalidatePath('/admin');
    return { ok: true };
  }
  return { ok: false, error: 'Username atau password salah.' };
}

export async function adminLogoutAction() {
  await doAdminLogout();
  revalidatePath('/');
  return { ok: true };
}

export async function changeAdminPasswordAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const oldP = String(formData.get('old') || '');
  const newP = String(formData.get('new') || '');
  if (newP.length < 6) return { ok: false, error: 'Password baru minimal 6 karakter.' };
  const db = getDb();
  const row = db.prepare('SELECT * FROM admin WHERE id = 1').get() as {
    password_hash: string;
    salt: string;
  };
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const oldHash = crypto.scryptSync(oldP, row.salt, 64).toString('hex');
  if (oldHash !== row.password_hash) return { ok: false, error: 'Password lama salah.' };
  const salt = makeSalt();
  const password_hash = hashPassword(newP, salt);
  db.prepare('UPDATE admin SET password_hash=?, salt=? WHERE id=1').run(password_hash, salt);
  return { ok: true };
}

// ---------------- ACCOUNT TOKEN ----------------
export async function createTokenAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const accountId = Number(formData.get('accountId'));
  const token = setAccountToken(accountId);
  revalidatePath('/admin');
  return { ok: true, token, accountId };
}

export async function resetAllTokensAction() {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  for (const a of listAccounts()) setAccountToken(a.id);
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------- PAIRS ----------------
export async function savePairAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const number = Number(formData.get('number'));
  if (![1, 2, 3].includes(number)) return { ok: false, error: 'Nomor pasangan harus 1-3.' };
  let photo = String(formData.get('photo_url') || '').trim();
  // Batasi ukuran foto (data-URL) agar DB tidak membengkak: maks ~1.5 MB.
  if (photo && photo.startsWith('data:') && photo.length > 1_500_000) {
    return { ok: false, error: 'Foto terlalu besar (maks 1.5 MB).' };
  }
  upsertPair({
    number,
    chair_name: String(formData.get('chair_name') || '').trim(),
    vice_name: String(formData.get('vice_name') || '').trim(),
    vision: String(formData.get('vision') || '').trim(),
    photo_url: photo,
    active: formData.get('active') === 'on' ? 1 : 0,
  });
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/scoreboard');
  return { ok: true };
}

export async function deletePairAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  deletePair(Number(formData.get('id')));
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/scoreboard');
  return { ok: true };
}

// ---------------- NEWS ----------------
export async function saveNewsAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const id = formData.get('id') ? Number(formData.get('id')) : undefined;
  // Saat edit, pertahankan flag featured/is_new yang sudah ada (tidak diubah oleh form).
  let featured = 0;
  let is_new = 0;
  if (id) {
    const existing = getNews(id);
    featured = existing?.featured ?? 0;
    is_new = existing?.is_new ?? 0;
  }
  upsertNews({
    id,
    title: String(formData.get('title') || '').trim(),
    body: String(formData.get('body') || '').trim(),
    cover_url: String(formData.get('cover_url') || '').trim() || null,
    featured,
    is_new,
    published: formData.get('published') === 'on' ? 1 : 0,
  });
  revalidatePath('/');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteNewsAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  deleteNews(Number(formData.get('id')));
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/berita');
  return { ok: true };
}

export async function toggleNewsFlagAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const id = Number(formData.get('id'));
  const flag = String(formData.get('flag') || 'featured'); // 'featured' | 'is_new'
  if (!['featured', 'is_new'].includes(flag)) return { ok: false, error: 'Flag tidak dikenal.' };
  const news = getNews(id);
  if (!news) return { ok: false, error: 'Berita tidak ditemukan.' };
  if (flag === 'featured') {
    // Hanya satu berita yang "Terkini" — matikan semua, lalu nyalakan ini.
    const db = getDb();
    db.prepare('UPDATE news SET featured = 0').run();
    db.prepare('UPDATE news SET featured = 1 WHERE id = ?').run(id);
  } else {
    upsertNews({ id, title: news.title, body: news.body, cover_url: news.cover_url, featured: news.featured, is_new: news.is_new ? 0 : 1, published: news.published });
  }
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/berita');
  return { ok: true };
}

// ---------------- VOTER ----------------
export async function voterLoginAction(formData: FormData) {
  const accountId = Number(formData.get('accountId')) || 1;
  const token = String(formData.get('token') || '').trim().toUpperCase();
  const res = await doVoterLogin(accountId, token);
  if (res.ok) {
    revalidatePath('/vote');
    return { ok: true, voterNo: res.voterNo };
  }
  return { ok: false, error: res.error || 'Token salah atau belum dibuat admin.' };
}

export async function voterLogoutAction() {
  await doVoterLogout();
  revalidatePath('/');
  return { ok: true };
}

export async function castVoteAction(formData: FormData) {
  const session = await currentVoterSession();
  if (!session) return { ok: false, error: 'Sesi tidak valid. Silakan login ulang dengan token Anda.' };
  const pairId = Number(formData.get('pairId'));
  const res = castVote(session.accountId, pairId, session.voterId);
  // Hancurkan sesi voter setelah memilih (satu sesi = satu suara).
  await doVoterLogout();
  revalidatePath('/scoreboard');
  revalidatePath('/admin');
  revalidatePath('/vote');
  revalidatePath('/');
  return { ok: true, voter_no: res.voter_no, accountId: session.accountId, voterNo: session.voterNo };
}

// ---------------- DAFTAR PEMILIH TETAP (DPT / BATCH 1-300) ----------------
export async function generateVotersAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const fromNo = Number(formData.get('fromNo') || 1);
  const toNo = Number(formData.get('toNo') || 300);
  if (fromNo < 1 || toNo < fromNo) {
    return { ok: false, error: 'Rentang nomor pemilih tidak valid (minimal 1).' };
  }
  if (toNo - fromNo > 2000) {
    return { ok: false, error: 'Maksimal pembuatan per batch adalah 2.000 token.' };
  }
  const res = generateVotersBatch(fromNo, toNo);
  revalidatePath('/admin');
  return { ok: true, count: res.count, start: res.start, end: res.end };
}

export async function resetVotersAction() {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  resetAllVoters();
  revalidatePath('/admin');
  return { ok: true };
}

// ---------------- RESET ----------------
export async function resetVotesAction() {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  resetVotes();
  revalidatePath('/');
  revalidatePath('/scoreboard');
  revalidatePath('/admin');
  return { ok: true };
}

export async function getAuditAction() {
  if (!(await isAdmin())) return [];
  return listAudit();
}

// ---------- SETTINGS (logo / maskot / org) ----------
export async function saveSettingsAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const org_name = String(formData.get('org_name') || '').trim();
  const org_subtitle = String(formData.get('org_subtitle') || '').trim();
  let logo_url = String(formData.get('logo_url') || '').trim();
  let mascot_url = String(formData.get('mascot_url') || '').trim();
  if (logo_url && logo_url.startsWith('data:') && logo_url.length > 1_500_000) {
    return { ok: false, error: 'Logo terlalu besar (maks 1.5 MB).' };
  }
  if (mascot_url && mascot_url.startsWith('data:') && mascot_url.length > 1_500_000) {
    return { ok: false, error: 'Maskot terlalu besar (maks 1.5 MB).' };
  }
  saveSettings({ org_name, org_subtitle, logo_url, mascot_url });
  revalidatePath('/');
  revalidatePath('/admin');
  return { ok: true };
}

// ---------- RULES (panduan pemilos) ----------
export async function saveRulesAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const headline = String(formData.get('headline') || '').trim() || 'Peraturan & Tata Cara Pemilihan';
  const body = String(formData.get('body') || '').trim();
  saveRules(headline, body);
  revalidatePath('/panduan');
  revalidatePath('/admin');
  return { ok: true };
}

// ---------- SCOREBOARD CONTROL (admin) ----------
export async function setScoreboardPublishedAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  setScoreboardPublished(formData.get('published') === 'on');
  revalidatePath('/scoreboard');
  revalidatePath('/admin');
  return { ok: true };
}

export async function setScoreboardRevealedAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  const revealed = Number(formData.get('revealed'));
  setScoreboardRevealed(revealed);
  revalidatePath('/scoreboard');
  revalidatePath('/admin');
  return { ok: true };
}

// ---------- VOTING CONTROL (admin) ----------
export async function setVotingOpenAction(formData: FormData) {
  if (!(await isAdmin())) return { ok: false, error: 'Tidak berwenang.' };
  setVotingOpen(formData.get('open') === 'on');
  revalidatePath('/vote');
  revalidatePath('/admin');
  return { ok: true };
}

// Kembalikan daftar akun (untuk modal login pemilihan di beranda).
export async function listAccountsAction() {
  return listAccounts().map((a) => ({
    id: a.id,
    label: a.label,
    has_token: a.has_token,
  }));
}
