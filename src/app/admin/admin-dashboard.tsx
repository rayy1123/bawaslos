'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  savePairAction,
  deletePairAction,
  saveNewsAction,
  deleteNewsAction,
  toggleNewsFlagAction,
  createTokenAction,
  resetAllTokensAction,
  resetVotesAction,
  changeAdminPasswordAction,
  adminLogoutAction,
  setScoreboardPublishedAction,
  setScoreboardRevealedAction,
  setVotingOpenAction,
  saveRulesAction,
  saveSettingsAction,
  generateVotersAction,
  resetVotersAction,
} from '@/lib/actions';
import type { Pair, NewsItem, Account, VoterRecord } from '@/lib/queries';
import LogoSeal from '@/components/LogoSeal';

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type Props = {
  pairs: Pair[];
  news: NewsItem[];
  accounts: Account[];
  voters?: VoterRecord[];
  votersStats?: { total: number; used: number; unused: number; turnout: number };
  total: number;
  byAccount: { account_id: number; count: number }[];
  audit: { id: number; action: string; detail: string; account_id: number | null; created_at: string }[];
  scoreboard: { published: boolean; revealed: number; total: number };
  votingOpen: boolean;
  rules: { headline: string; body: string };
  settings: { org_name: string; org_subtitle: string; logo_url: string; mascot_url: string };
};

export default function AdminDashboard({
  pairs,
  news,
  accounts,
  voters = [],
  votersStats = { total: 0, used: 0, unused: 0, turnout: 0 },
  total,
  byAccount,
  audit,
  scoreboard,
  votingOpen,
  rules,
  settings,
}: Props) {
  const router = useRouter();
  const [active, setActive] = useState<'pairs' | 'news' | 'tokens' | 'scoreboard' | 'panduan' | 'audit' | 'settings'>('pairs');
  const [tokenModal, setTokenModal] = useState<{ accountId: number; token: string } | null>(null);
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [revealDraft, setRevealDraft] = useState(scoreboard.revealed);
  const [votingOpenDraft, setVotingOpenDraft] = useState(votingOpen);
  const [photoDrafts, setPhotoDrafts] = useState<Record<number, string>>({});
  const [logoDraft, setLogoDraft] = useState('');
  const [mascotDraft, setMascotDraft] = useState('');
  const [coverDraft, setCoverDraft] = useState('');
  const [brandMsg, setBrandMsg] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newsEdit, setNewsEdit] = useState<{ id?: number; title: string; body: string; cover_url: string }>({
    title: '',
    body: '',
    cover_url: '',
  });
  const [genFrom, setGenFrom] = useState(1);
  const [genTo, setGenTo] = useState(300);
  const [genBusy, setGenBusy] = useState(false);
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'all' | 'used' | 'unused'>('all');

  function notify(text: string, type: 'success' | 'error' = 'success') {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  }

  async function refresh() {
    router.refresh();
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    await setScoreboardPublishedAction(fd);
    refresh();
  }

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('revealed', String(revealDraft));
    await setScoreboardRevealedAction(fd);
    refresh();
  }

  async function handleStep(delta: number) {
    const next = Math.max(0, Math.min(revealDraft + delta, scoreboard.total));
    setRevealDraft(next);
    const fd = new FormData();
    fd.set('revealed', String(next));
    await setScoreboardRevealedAction(fd);
    refresh();
  }

  async function handleGenerateVoters(e: React.FormEvent) {
    e.preventDefault();
    if (genFrom < 1 || genTo < genFrom) {
      notify('Rentang nomor pemilih tidak valid.', 'error');
      return;
    }
    const count = genTo - genFrom + 1;
    if (voters.length > 0 && !confirm(`Generate ulang ${count} token (No. ${genFrom} - ${genTo})? Token lama pada nomor ini akan diganti.`)) {
      return;
    }
    setGenBusy(true);
    const fd = new FormData();
    fd.set('fromNo', String(genFrom));
    fd.set('toNo', String(genTo));
    const res = await generateVotersAction(fd);
    setGenBusy(false);
    if (res.ok) {
      notify(`Berhasil generate ${res.count} token pemilih (No. ${res.start} - ${res.end})! Siap diekspor ke Excel.`);
      refresh();
    } else {
      notify(res.error || 'Gagal generate token.', 'error');
    }
  }

  async function handleResetVoters() {
    if (!confirm('HAPUS SEMUA DATA TOKEN PEMILIH DPT? Data pemilih dan token akan dikosongkan.')) return;
    const res = await resetVotersAction();
    if (res.ok) {
      notify('Seluruh data token pemilih berhasil dihapus.');
      refresh();
    } else {
      notify(res.error || 'Gagal mereset token.', 'error');
    }
  }

  async function handleCreateToken(accountId: number) {
    const fd = new FormData();
    fd.set('accountId', String(accountId));
    const res = await createTokenAction(fd);
    if (res.ok) setTokenModal({ accountId, token: res.token || '' });
  }

  async function handleResetAllTokens() {
    if (!confirm('Buat ulang token untuk KETIGA akun? Token lama tidak berlaku.')) return;
    await resetAllTokensAction();
    refresh();
  }

  async function handleResetVotes() {
    if (!confirm('HAPUS SELURUH SUARA? Tindakan tidak bisa dibatalkan.')) return;
    await resetVotesAction();
    refresh();
  }

  async function handleChangePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPwBusy(true);
    setPwMsg('');
    const fd = new FormData(form);
    const res = await changeAdminPasswordAction(fd);
    setPwBusy(false);
    setPwMsg(res.ok ? 'Password admin berhasil diubah.' : res.error || 'Gagal.');
    if (res.ok) {
      form.reset();
      notify('Password admin berhasil diubah.');
    } else {
      notify(res.error || 'Gagal mengubah password.', 'error');
    }
  }

  async function handleLogout() {
    await adminLogoutAction();
    router.push('/admin/login');
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoSeal src={settings.logo_url} className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-extrabold text-[#0b1f4b]">Dashboard Pengawas</h1>
            <p className="text-sm text-slate-600">Bawaslos · {total} suara tercatat</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50">
            Tutup
          </Link>
          <button onClick={handleLogout} className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#142c63]">
            Keluar
          </button>
        </div>
      </header>

      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-all ${
            feedback.type === 'error'
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span>{feedback.type === 'error' ? '⚠️ ' : '✓ '}{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab nav */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {(['pairs', 'news', 'tokens', 'scoreboard', 'panduan', 'audit', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              active === t ? 'bg-[#0b1f4b] text-white' : 'bg-white text-[#0b1f4b] border border-slate-200'
            }`}
          >
            {t === 'pairs' && 'Pasangan'}
            {t === 'news' && 'Berita'}
            {t === 'tokens' && 'Token Pemilih'}
            {t === 'scoreboard' && 'Scoreboard'}
            {t === 'panduan' && 'Panduan'}
            {t === 'audit' && 'Audit'}
            {t === 'settings' && 'Pengaturan'}
          </button>
        ))}
      </nav>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        {active === 'pairs' && (
          <div>
            <h2 className="font-bold text-[#0b1f4b]">Kelola Pasangan Calon (3 Kotak)</h2>
            <div className="mt-4 space-y-4">
              {[1, 2, 3].map((num) => {
                const p = pairs.find((x) => x.number === num);
                return (
                  <form
                    key={num}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget as HTMLFormElement);
                      const res = await savePairAction(fd);
                      if (res.ok) {
                        notify(`Data Pasangan #${num} berhasil disimpan.`);
                        refresh();
                      } else {
                        notify(res.error || 'Gagal menyimpan pasangan.', 'error');
                      }
                    }}
                    className="grid gap-2 rounded-xl border border-slate-50 p-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="number" value={num} />
                    <div>
                      <label className="text-xs font-medium text-slate-600">Ketua (Pasangan #{num})</label>
                      <input name="chair_name" defaultValue={p?.chair_name || ''} placeholder="Nama Ketua"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Wakil Ketua</label>
                      <input name="vice_name" defaultValue={p?.vice_name || ''} placeholder="Nama Wakil"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-600">Visi (opsional)</label>
                      <textarea name="vision" defaultValue={p?.vision || ''} rows={2}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-600">Foto Pasangan (maks 1.5 MB)</label>
                      <div className="mt-1 flex items-center gap-3">
                        {(photoDrafts[num] || p?.photo_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoDrafts[num] || p?.photo_url}
                            alt={`Pasangan ${num}`}
                            className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            ?
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const dataUrl = await readFileAsDataURL(f);
                            setPhotoDrafts((d) => ({ ...d, [num]: dataUrl }));
                          }}
                          className="text-xs"
                        />
                        <input type="hidden" name="photo_url" value={photoDrafts[num] || p?.photo_url || ''} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" name="active" defaultChecked={p ? p.active === 1 : true} /> Tampilkan di beranda
                      </label>
                      <button className="rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                        Simpan
                      </button>
                      {p && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Hapus pasangan ini?')) return;
                            const fd = new FormData();
                            fd.set('id', String(p.id));
                            const res = await deletePairAction(fd);
                            if (res.ok) {
                              notify(`Pasangan #${num} berhasil dihapus.`);
                              refresh();
                            } else {
                              notify(res.error || 'Gagal menghapus pasangan.', 'error');
                            }
                          }}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </form>
                );
              })}
            </div>
          </div>
        )}

        {active === 'news' && (
          <div>
            <h2 className="font-bold text-[#0b1f4b]">Berita &amp; Pengumuman</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set('id', newsEdit.id ? String(newsEdit.id) : '');
                fd.set('title', newsEdit.title);
                fd.set('body', newsEdit.body);
                fd.set('cover_url', coverDraft || newsEdit.cover_url || '');
                fd.set('published', 'on');
                const res = await saveNewsAction(fd);
                if (res.ok) {
                  notify(newsEdit.id ? 'Perubahan berita berhasil disimpan.' : 'Berita baru berhasil ditambahkan.');
                  refresh();
                  setNewsEdit({ title: '', body: '', cover_url: '' });
                  setCoverDraft('');
                } else {
                  notify(res.error || 'Gagal menyimpan berita.', 'error');
                }
              }}
              className="mt-4 space-y-2 rounded-xl border border-slate-50 p-3"
            >
              <input
                name="title" placeholder="Judul berita" required value={newsEdit.title}
                onChange={(e) => setNewsEdit({ ...newsEdit, title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <textarea
                name="body" rows={3} placeholder="Isi berita / open recruitment" required value={newsEdit.body}
                onChange={(e) => setNewsEdit({ ...newsEdit, body: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">Gambar Cover (maks 1.5 MB)</span>
                <div className="flex items-center gap-3">
                  {coverDraft || newsEdit.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverDraft || newsEdit.cover_url} alt="cover" className="h-16 w-16 rounded-lg border border-[#b0892f] object-cover bg-white shadow-sm" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[#b0892f] bg-white text-[#b0892f] text-xs">IMG</div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">Pilih Gambar</span>
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (f.size > 1_500_000) { alert('Gambar terlalu besar (maks 1.5 MB).'); return; }
                      setCoverDraft(await readFileAsDataURL(f));
                    }} className="text-xs" />
                  </div>
                  <input type="hidden" name="cover_url" value={coverDraft || newsEdit.cover_url || ''} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                  {newsEdit.id ? 'Simpan Perubahan' : 'Tambah Berita'}
                </button>
                {newsEdit.id && (
                  <button
                    type="button"
                    onClick={() => { setNewsEdit({ title: '', body: '', cover_url: '' }); setCoverDraft(''); }}
                    className="text-xs font-semibold text-slate-500 underline"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
            <div className="mt-4 space-y-2">
              {news.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#0b1f4b]">{n.title}</p>
                        {n.featured ? <span className="badge-terkini">Terkini</span> : null}
                        {n.is_new ? <span className="badge-new">Baru</span> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                      {n.published ? (
                        <span className="text-xs text-emerald-600">Publik</span>
                      ) : (
                        <span className="text-xs text-slate-400">Draft</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={async () => {
                          const fd = new FormData();
                          fd.set('id', String(n.id));
                          fd.set('flag', 'featured');
                          await toggleNewsFlagAction(fd);
                          refresh();
                        }}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${n.featured ? 'bg-[#0b1f4b] text-[#c5a059]' : 'bg-slate-100 text-[#0b1f4b] hover:bg-slate-200'}`}
                      >
                        {n.featured ? '★ Terkini' : 'Jadikan Terkini'}
                      </button>
                      <button
                        onClick={async () => {
                          const fd = new FormData();
                          fd.set('id', String(n.id));
                          fd.set('flag', 'is_new');
                          await toggleNewsFlagAction(fd);
                          refresh();
                        }}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${n.is_new ? 'bg-[#b0892f] text-white' : 'bg-slate-100 text-[#0b1f4b] hover:bg-slate-200'}`}
                      >
                        {n.is_new ? '✓ Baru' : 'Tandai Baru'}
                      </button>
                      <button
                        onClick={async () => {
                          setNewsEdit({
                            id: n.id,
                            title: n.title,
                            body: n.body,
                            cover_url: n.cover_url ?? '',
                          });
                        }}
                        className="text-xs font-semibold text-[#0b1f4b] underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Hapus berita?')) return;
                          const fd = new FormData();
                          fd.set('id', String(n.id));
                          const res = await deleteNewsAction(fd);
                          if (res.ok) {
                            notify('Berita berhasil dihapus.');
                            refresh();
                          } else {
                            notify(res.error || 'Gagal menghapus berita.', 'error');
                          }
                        }}
                        className="text-xs font-semibold text-red-600 underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'tokens' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-bold text-[#0b1f4b]">Daftar Pemilih Tetap (DPT) &amp; Token Massal</h2>
              <p className="mt-1 text-sm text-slate-600">
                Generate kode token unik untuk pemilih (misal 1 s.d. 300), lalu unduh ke Excel (CSV)
                atau cetak kartu/slip pemilih untuk dibagikan saat registrasi.
              </p>
            </div>

            {/* Form Generator Token 1-300 */}
            <div className="rounded-2xl border border-[#b0892f]/30 bg-[#fbf8f2] p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#0b1f4b]">⚡ Generator Token Pemilih (1 s.d. 300)</h3>
              <form onSubmit={handleGenerateVoters} className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">No. Urut Awal</label>
                  <input
                    type="number"
                    min={1}
                    value={genFrom}
                    onChange={(e) => setGenFrom(Number(e.target.value))}
                    className="mt-1 w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold focus:border-[#0b1f4b] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">No. Urut Akhir</label>
                  <input
                    type="number"
                    min={genFrom}
                    value={genTo}
                    onChange={(e) => setGenTo(Number(e.target.value))}
                    className="mt-1 w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold focus:border-[#0b1f4b] focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={genBusy}
                  className="rounded-lg bg-[#0b1f4b] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#142c63] disabled:opacity-50"
                >
                  {genBusy ? 'Membuat Token…' : `⚡ Generate ${Math.max(0, genTo - genFrom + 1)} Token`}
                </button>
              </form>

              {/* Action Bar: Download Excel & Cetak */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#0b1f4b]/10 pt-4">
                <a
                  href="/api/export-voters?format=csv"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2e7d32] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1b5e20]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  📥 Unduh File Excel (CSV)
                </a>
                <a
                  href="/admin/cetak-token"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#0b1f4b] bg-white px-4 py-2 text-xs font-bold text-[#0b1f4b] shadow-sm hover:bg-slate-50"
                >
                  <svg className="h-4 w-4 text-[#b0892f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  🖨️ Cetak Slip Token (PDF / Siap Potong)
                </a>
                {voters.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetVoters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    🗑️ Reset Semua Token DPT
                  </button>
                )}
              </div>
            </div>

            {/* Statistik DPT Ringkas */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total DPT</span>
                <p className="mt-1 font-mono text-2xl font-extrabold text-[#0b1f4b]">{votersStats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Sudah Memilih</span>
                <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-800">{votersStats.used}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3.5 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Belum Memilih</span>
                <p className="mt-1 font-mono text-2xl font-extrabold text-amber-800">{votersStats.unused}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Partisipasi</span>
                <p className="mt-1 font-mono text-2xl font-extrabold text-[#0b1f4b]">{votersStats.turnout}%</p>
              </div>
            </div>

            {/* Tabel Pencarian & Filter DPT */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-1.5">
                  {(['all', 'unused', 'used'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setVoterFilter(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        voterFilter === f
                          ? 'bg-[#0b1f4b] text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f === 'all' && `Semua (${voters.length})`}
                      {f === 'unused' && `Belum Memilih (${votersStats.unused})`}
                      {f === 'used' && `Sudah Memilih (${votersStats.used})`}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Cari nomor pemilih atau token…"
                  value={voterSearch}
                  onChange={(e) => setVoterSearch(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-[#0b1f4b] focus:outline-none sm:w-64"
                />
              </div>

              {/* Tabel daftar token */}
              <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-slate-100">
                {(() => {
                  const filtered = voters.filter((v) => {
                    if (voterFilter === 'used' && v.is_used !== 1) return false;
                    if (voterFilter === 'unused' && v.is_used === 1) return false;
                    if (voterSearch) {
                      const q = voterSearch.toLowerCase();
                      return (
                        String(v.voter_no).includes(q) ||
                        v.token.toLowerCase().includes(q) ||
                        v.name.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-400">
                        {voters.length === 0
                          ? 'Belum ada token pemilih. Klik "Generate Token" di atas untuk membuat token 1-300.'
                          : 'Tidak ada pemilih yang cocok dengan filter atau kata kunci.'}
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5">No. Urut</th>
                          <th className="px-3 py-2.5">Nama / Identitas</th>
                          <th className="px-3 py-2.5">Kode Token</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Waktu Mencoblos</th>
                          <th className="px-3 py-2.5">Bilik Suara</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 font-mono font-bold text-[#0b1f4b]">
                              #{String(v.voter_no).padStart(3, '0')}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{v.name}</td>
                            <td className="px-3 py-2 font-mono text-sm font-extrabold tracking-widest text-[#0b1f4b]">
                              {v.token}
                            </td>
                            <td className="px-3 py-2">
                              {v.is_used === 1 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  ✓ Sudah Memilih
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  ● Belum Memilih
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {v.used_at ? new Date(v.used_at.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID') : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {v.used_booth ? `Bilik ${v.used_booth}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* Opsi Bilik Suara Fisik (Akun 1, 2, 3) */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="text-xs font-bold text-slate-700">Token Bilik Fisik Alternatif (Akun 1, 2, 3)</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Mode darurat manual untuk mengunci perangkat bilik tanpa DPT massal.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {accounts.map((a) => {
                  const votes = byAccount.find((b) => b.account_id === a.id)?.count || 0;
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                      <div>
                        <p className="text-xs font-bold text-[#0b1f4b]">{a.label}</p>
                        <p className="text-[10px] text-slate-500">
                          {a.has_token ? `Hint: ${a.token_hint}•••• · ${votes} suara` : 'Kosong'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCreateToken(a.id)}
                        className="rounded bg-[#0b1f4b] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#142c63]"
                      >
                        {a.has_token ? 'Reset' : 'Buat'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleResetAllTokens}
                className="mt-3 text-xs font-semibold text-slate-500 underline hover:text-[#0b1f4b]"
              >
                Reset Semua Token Akun Bilik Fisik
              </button>
            </div>
          </div>
        )}

        {active === 'scoreboard' && (
          <div>
            <h2 className="font-bold text-[#0b1f4b]">Kontrol Scoreboard Publik</h2>
            <p className="mt-1 text-sm text-slate-600">
              Publik hanya bisa melihat scoreboard bila kamu membukanya, dan hanya sebanyak suara
              yang kamu reveal. Publik tidak dapat mengubah apa pun.
            </p>

            <form onSubmit={handlePublish} className="mt-4 flex items-center gap-3 rounded-xl border border-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#0b1f4b]">
                <input type="checkbox" name="published" defaultChecked={scoreboard.published} /> Buka scoreboard untuk publik
              </label>
              <button className="rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                Simpan
              </button>
              <span className={`text-xs ${scoreboard.published ? 'text-emerald-600' : 'text-slate-400'}`}>
                {scoreboard.published ? 'Status: TERBUKA' : 'Status: TERTUTUP'}
              </span>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set('open', votingOpenDraft ? 'on' : 'off');
                await setVotingOpenAction(fd);
                refresh();
              }}
              className="mt-3 flex items-center gap-3 rounded-xl border border-slate-50 p-3"
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-[#0b1f4b]">
                <input
                  type="checkbox"
                  checked={votingOpenDraft}
                  onChange={(e) => setVotingOpenDraft(e.target.checked)}
                /> Buka halaman voting untuk pemilih
              </label>
              <button className="rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                Simpan
              </button>
              <span className={`text-xs ${votingOpenDraft ? 'text-emerald-600' : 'text-slate-400'}`}>
                {votingOpenDraft ? 'Status: VOTING DIBUKA' : 'Status: VOTING DITUTUP'}
              </span>
            </form>

            <div className="mt-4 rounded-xl border border-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#0b1f4b]">
                  Suara diumumkan: {scoreboard.revealed} / {scoreboard.total}
                </span>
                <button
                  onClick={() => handleStep(-1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50"
                >
                  − 1
                </button>
                <button
                  onClick={() => handleStep(1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50"
                >
                  + 1
                </button>
                <button
                  onClick={() => handleStep(scoreboard.total - scoreboard.revealed)}
                  className="rounded-lg bg-[#0b1f4b] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]"
                >
                  Reveal Semua
                </button>
                <button
                  onClick={() => { setRevealDraft(0); (async()=>{const fd=new FormData();fd.set('revealed','0');await setScoreboardRevealedAction(fd);refresh();})(); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50"
                >
                  Reset Reveal
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={scoreboard.total}
                value={revealDraft}
                onChange={(e) => setRevealDraft(Number(e.target.value))}
                className="mt-3 w-full"
              />
              <form onSubmit={handleReveal} className="mt-2">
                <button className="rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                  Terapkan Jumlah Reveal
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-[#0b1f4b]">Ekspor Hasil:</span>
                <a href="/api/export?format=csv" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50">
                  Download CSV
                </a>
                <a href="/api/export?format=json" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50">
                  Download JSON
                </a>
                <button
                  onClick={() => window.open('/scoreboard?print=1', '_blank')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-[#0b1f4b] hover:bg-slate-50"
                >
                  Cetak / PDF
                </button>
              </div>
              <Link href="/scoreboard" className="mt-2 inline-block text-xs font-semibold text-[#0b1f4b] underline">
                Lihat tampilan publik →
              </Link>
            </div>
          </div>
        )}

        {active === 'panduan' && (
          <div>
            <h2 className="font-bold text-[#0b1f4b]">Panduan Pemilos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Isi peraturan &amp; tata cara yang berlaku. Tampil di halaman publik /panduan.
              Gunakan format bernomor (1. …, 2. …) di tiap baris.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                const res = await saveRulesAction(fd);
                if (res.ok) {
                  notify('Panduan pemilos berhasil diperbarui.');
                  refresh();
                } else {
                  notify(res.error || 'Gagal menyimpan panduan.', 'error');
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="text-xs font-medium text-slate-600">Judul</label>
                <input
                  name="headline"
                  defaultValue={rules.headline}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Isi (tiap baris = 1 poin)</label>
                <textarea
                  name="body"
                  defaultValue={rules.body}
                  rows={10}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                  Simpan Panduan
                </button>
                <Link href="/panduan" className="text-xs font-semibold text-[#0b1f4b] underline">
                  Lihat publik →
                </Link>
              </div>
            </form>
          </div>
        )}

        {active === 'audit' && (
          <div>
            <h2 className="font-bold text-[#0b1f4b]">Log Audit</h2>
            <div className="mt-4 max-h-96 space-y-1 overflow-y-auto rounded-xl border border-slate-50 p-3 text-sm">
              {audit.length === 0 && <p className="text-slate-400">Belum ada aktivitas.</p>}
              {audit.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-slate-50 py-1 last:border-0">
                  <span className="font-medium text-[#0b1f4b]">[{a.action}]</span>
                  <span className="text-slate-600">{a.detail}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(a.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === 'settings' && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                const nextLogo = logoDraft || settings.logo_url || '';
                fd.set('logo_url', nextLogo);
                fd.set('mascot_url', mascotDraft || settings.mascot_url || '');
                const res = await saveSettingsAction(fd);
                if (res.ok) {
                  notify(
                    nextLogo
                      ? 'Branding tersimpan. Logo berhasil diganti & tampil di seluruh halaman.'
                      : 'Branding tersimpan. Logo dikosongkan.'
                  );
                  setLogoDraft('');
                  setMascotDraft('');
                  refresh();
                } else {
                  notify(res.error || 'Gagal menyimpan branding.', 'error');
                }
              }}
              className="rounded-xl border border-slate-50 p-3"
            >
              <h3 className="font-bold text-[#0b1f4b]">Identitas & Branding</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600">Nama Organisasi</label>
                  <input name="org_name" defaultValue={settings.org_name} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Subjudul</label>
                  <input name="org_subtitle" defaultValue={settings.org_subtitle} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Logo (maks 1.5 MB)</label>
                  <div className="mt-1 flex items-center gap-3">
                    {logoDraft || settings.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoDraft || settings.logo_url} alt="logo" className="h-20 w-20 rounded-lg border border-[#b0892f] object-contain bg-white shadow-sm" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[#b0892f] bg-white text-[#b0892f]">L</div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">Preview</span>
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setLogoDraft(await readFileAsDataURL(f));
                        setBrandMsg('');
                      }} className="text-xs" />
                    </div>
                    <input type="hidden" name="logo_url" value={logoDraft || settings.logo_url || ''} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Maskot (maks 1.5 MB)</label>
                  <div className="mt-1 flex items-center gap-3">
                    {mascotDraft || settings.mascot_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mascotDraft || settings.mascot_url} alt="maskot" className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-200" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">M</div>
                    )}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setMascotDraft(await readFileAsDataURL(f));
                    }} className="text-xs" />
                    <input type="hidden" name="mascot_url" value={mascotDraft || settings.mascot_url || ''} />
                  </div>
                </div>
              </div>
              <button className="mt-3 rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63]">
                Simpan Branding
              </button>
              {brandMsg && (
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  ✓ {brandMsg}
                </p>
              )}
            </form>

            <form onSubmit={handleChangePw} className="rounded-xl border border-slate-50 p-3">
              <h3 className="font-bold text-[#0b1f4b]">Ganti Password Admin</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input name="old" type="password" placeholder="Password lama" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input name="new" type="password" placeholder="Password baru (min 6)" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <button disabled={pwBusy} className="mt-3 rounded-lg bg-[#0b1f4b] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#142c63] disabled:opacity-50">
                {pwBusy ? 'Menyimpan…' : 'Ubah Password'}
              </button>
              {pwMsg && <p className="mt-2 text-sm text-emerald-700">{pwMsg}</p>}
            </form>

            <div className="rounded-xl border border-red-100 p-3">
              <h3 className="font-bold text-red-700">Zona Berbahaya</h3>
              <p className="mt-1 text-sm text-slate-600">Menghapus seluruh suara akan mengembalikan penghitungan ke nol. Akun & token tetap ada.</p>
              <button onClick={handleResetVotes}
                className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                Reset Seluruh Suara
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal token */}
      {tokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h3 className="text-lg font-bold text-[#0b1f4b]">Token Akun {tokenModal.accountId}</h3>
            <p className="mt-1 text-sm text-slate-600">Salin & berikan ke pemilih. Tidak ditampilkan lagi.</p>
            <div className="mt-4 select-all rounded-xl bg-slate-50 px-4 py-3 text-2xl font-extrabold tracking-[0.3em] text-[#0b1f4b]">
              {tokenModal.token}
            </div>
            <button onClick={() => setTokenModal(null)}
              className="mt-5 w-full rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white hover:bg-[#142c63]">
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
