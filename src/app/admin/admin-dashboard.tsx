'use client';

import { useState, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();

  const [active, setActive] = useState<'overview' | 'tokens' | 'scoreboard' | 'pairs' | 'news' | 'panduan' | 'audit' | 'settings'>('overview');
  const [tokenModal, setTokenModal] = useState<{ accountId: number; token: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [pwBusy, setPwBusy] = useState(false);
  const [revealDraft, setRevealDraft] = useState(scoreboard.revealed);
  const [votingOpenDraft, setVotingOpenDraft] = useState(votingOpen);
  const [scoreboardPubDraft, setScoreboardPubDraft] = useState(scoreboard.published);

  const [photoDrafts, setPhotoDrafts] = useState<Record<number, string>>({});
  const [logoDraft, setLogoDraft] = useState('');
  const [mascotDraft, setMascotDraft] = useState('');
  const [coverDraft, setCoverDraft] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  function notify(text: string, type: 'success' | 'error' | 'info' = 'success') {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  }

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function copyToClipboard(text: string, label = 'Tersalin!') {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(text);
      notify(label, 'info');
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      notify('Gagal menyalin token ke clipboard.', 'error');
    }
  }

  async function handleToggleVotingOpen(open: boolean) {
    setVotingOpenDraft(open);
    const fd = new FormData();
    fd.set('open', open ? 'on' : 'off');
    const res = await setVotingOpenAction(fd);
    if (res.ok) {
      notify(open ? 'Bilik voting dibuka untuk pemilih.' : 'Bilik voting berhasil ditutup.');
      refresh();
    } else {
      notify('Gagal mengubah status voting.', 'error');
    }
  }

  async function handleToggleScoreboardPub(pub: boolean) {
    setScoreboardPubDraft(pub);
    const fd = new FormData();
    if (pub) fd.set('published', 'on');
    const res = await setScoreboardPublishedAction(fd);
    if (res.ok) {
      notify(pub ? 'Scoreboard dibuka untuk umum.' : 'Scoreboard ditutup dari umum.');
      refresh();
    } else {
      notify('Gagal mengubah status scoreboard.', 'error');
    }
  }

  async function handleReveal(nextVal: number) {
    const clamped = Math.max(0, Math.min(nextVal, scoreboard.total));
    setRevealDraft(clamped);
    const fd = new FormData();
    fd.set('revealed', String(clamped));
    await setScoreboardRevealedAction(fd);
    notify(`Hasil yang diumumkan: ${clamped} dari ${scoreboard.total} suara.`);
    refresh();
  }

  async function handleStep(delta: number) {
    const next = Math.max(0, Math.min(scoreboard.revealed + delta, scoreboard.total));
    await handleReveal(next);
  }

  async function handleGenerateVoters(e: React.FormEvent) {
    e.preventDefault();
    if (genFrom < 1 || genTo < genFrom) {
      notify('Rentang nomor pemilih tidak valid.', 'error');
      return;
    }
    const count = genTo - genFrom + 1;
    if (voters.length > 0 && !confirm(`Generate ${count} token (No. ${genFrom} - ${genTo})? Token lama pada rentang nomor ini akan diperbarui.`)) {
      return;
    }
    setGenBusy(true);
    const fd = new FormData();
    fd.set('fromNo', String(genFrom));
    fd.set('toNo', String(genTo));
    const res = await generateVotersAction(fd);
    setGenBusy(false);
    if (res.ok) {
      notify(`Berhasil generate ${res.count} token pemilih (No. ${res.start} - ${res.end})!`);
      refresh();
    } else {
      notify(res.error || 'Gagal generate token.', 'error');
    }
  }

  async function handleResetVoters() {
    if (!confirm('HAPUS SEMUA DATA TOKEN PEMILIH DPT? Data pemilih dan status memilih akan dikosongkan.')) return;
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
    if (!confirm('Buat ulang token untuk KETIGA akun bilik fisik? Token lama tidak berlaku lagi.')) return;
    await resetAllTokensAction();
    notify('Token ketiga akun bilik berhasil diperbarui.');
    refresh();
  }

  async function handleResetVotes() {
    if (!confirm('HAPUS SELURUH SUARA YANG MASUK? Semua perolehan paslon akan kembali ke 0. Tindakan ini tidak dapat dibatalkan.')) return;
    await resetVotesAction();
    notify('Seluruh suara berhasil direset.');
    refresh();
  }

  async function handleChangePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPwBusy(true);
    const fd = new FormData(form);
    const res = await changeAdminPasswordAction(fd);
    setPwBusy(false);
    if (res.ok) {
      form.reset();
      notify('Password admin berhasil diperbarui.');
    } else {
      notify(res.error || 'Gagal mengubah password.', 'error');
    }
  }

  async function handleLogout() {
    await adminLogoutAction();
    router.push('/admin/login');
  }

  const filteredVoters = voters.filter((v) => {
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

  return (
    <div className="min-h-screen bg-[#f7f6f1] pb-20 text-slate-800">
      {/* Top Header Bar - Optimized for Mobile */}
      <header className="sticky top-0 z-30 border-b border-[#0b1f4b]/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoSeal src={settings.logo_url} className="h-9 w-9 shrink-0 shadow-sm sm:h-11 sm:w-11" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-serif text-base font-bold tracking-tight text-[#0b1f4b] sm:text-xl">
                  {settings.org_name || 'BAWASLOS'}
                </h1>
                <span className="shrink-0 rounded-full bg-[#0b1f4b]/10 px-2 py-0.2 text-[9px] font-bold text-[#0b1f4b] sm:text-[10px]">
                  Admin
                </span>
              </div>
              <p className="truncate text-[10px] text-slate-500 sm:text-xs">
                {settings.org_subtitle || 'Badan Pengawas Pemilihan OSIS'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:px-3"
              title="Kembali ke Beranda"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Web</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0b1f4b] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#142c63] sm:px-3"
              title="Keluar dari Panel Admin"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification - Full width on mobile, corner on desktop */}
      {feedback && (
        <div className="fixed bottom-4 inset-x-4 z-50 animate-fade-in sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md">
          <div
            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-xl border ${
              feedback.type === 'error'
                ? 'border-red-200 bg-red-600 text-white'
                : feedback.type === 'info'
                ? 'border-blue-200 bg-[#0b1f4b] text-white'
                : 'border-emerald-200 bg-emerald-700 text-white'
            }`}
          >
            <span>
              {feedback.type === 'error' ? '⚠️' : feedback.type === 'info' ? '📋' : '✓'} {feedback.text}
            </span>
            <button
              onClick={() => setFeedback(null)}
              className="ml-auto rounded p-1 hover:bg-black/20"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-6">
        {/* KPI Cards / Quick Overview - Compact Mobile Grid */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3.5">
          {/* Card 1: Total Suara */}
          <div className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-[#0b1f4b]/10 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Suara Masuk</span>
              <span className="text-sm sm:text-base">🗳️</span>
            </div>
            <p className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-[#0b1f4b]">{total}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500 sm:text-[11px]">
              {votersStats.total > 0 ? `Dari ${votersStats.total} DPT` : 'Belum ada DPT'}
            </p>
          </div>

          {/* Card 2: Partisipasi */}
          <div className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">Partisipasi</span>
              <span className="text-sm sm:text-base">📊</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-800">{votersStats.turnout}%</p>
              <span className="text-[10px] font-semibold text-slate-500">
                ({votersStats.used})
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, votersStats.turnout)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Status Bilik Suara */}
          <div className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Bilik Suara</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                votingOpenDraft ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {votingOpenDraft ? 'Buka' : 'Tutup'}
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-800 sm:text-sm">
              {votingOpenDraft ? 'Bilik Aktif' : 'Terkunci'}
            </p>
            <button
              onClick={() => handleToggleVotingOpen(!votingOpenDraft)}
              className={`mt-2 flex w-full items-center justify-center rounded-lg py-1.5 text-[11px] sm:text-xs font-bold transition-colors ${
                votingOpenDraft
                  ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-[#0b1f4b] text-white hover:bg-[#142c63]'
              }`}
            >
              {votingOpenDraft ? 'Kunci Bilik' : 'Buka Bilik'}
            </button>
          </div>

          {/* Card 4: Scoreboard Publik */}
          <div className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Scoreboard</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                scoreboardPubDraft ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {scoreboardPubDraft ? 'Buka' : 'Tutup'}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[11px] sm:text-xs text-slate-600">
              <span>Hasil:</span>
              <span className="font-mono font-extrabold text-[#0b1f4b]">
                {scoreboard.revealed}/{scoreboard.total}
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => handleToggleScoreboardPub(!scoreboardPubDraft)}
                className={`flex-1 rounded-lg py-1.5 text-[11px] sm:text-xs font-bold transition-colors ${
                  scoreboardPubDraft
                    ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'bg-[#b0892f] text-[#0b1f4b] hover:bg-[#9c7826]'
                }`}
              >
                {scoreboardPubDraft ? 'Tutup' : 'Buka'}
              </button>
              <Link
                href="/scoreboard"
                target="_blank"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Buka Scoreboard Publik"
              >
                ↗
              </Link>
            </div>
          </div>
        </section>

        {/* Tab Navigation - Smooth Mobile Touch Scroll */}
        <nav className="mt-4 sm:mt-6 flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
          {[
            { id: 'overview', label: 'Ringkasan', icon: '⚡' },
            { id: 'tokens', label: 'DPT & Token', icon: '🎟️', count: voters.length },
            { id: 'scoreboard', label: 'Scoreboard', icon: '🏆', badge: `${scoreboard.revealed}/${scoreboard.total}` },
            { id: 'pairs', label: 'Paslon', icon: '👥', count: pairs.length },
            { id: 'news', label: 'Berita', icon: '📰', count: news.length },
            { id: 'panduan', label: 'Panduan', icon: '📖' },
            { id: 'audit', label: 'Audit', icon: '📜', count: audit.length },
            { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
          ].map((tab) => {
            const isCur = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id as any)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold transition-all ${
                  isCur
                    ? 'bg-[#0b1f4b] text-white shadow-sm ring-2 ring-[#0b1f4b]/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-extrabold ${
                      isCur ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-extrabold ${
                      isCur ? 'bg-[#c9a64a] text-[#0b1f4b]' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Content Container */}
        <div className="mt-3 sm:mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          {/* TAB 1: OVERVIEW */}
          {active === 'overview' && (
            <div className="space-y-5 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">Pusat Kendali Pengawas</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Status perangkat bilik suara fisik dan jalan pintas pengawasan.
                </p>
              </div>

              {/* Bilik Suara Fisik (Akun 1, 2, 3) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1f4b]">Terminal Bilik Suara Fisik</h3>
                    <p className="text-[11px] text-slate-500 sm:text-xs">Perangkat bilik tempat pemilih mencoblos.</p>
                  </div>
                  <button
                    onClick={handleResetAllTokens}
                    className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:self-auto"
                  >
                    Reset Semua Token Bilik
                  </button>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                  {accounts.map((a) => {
                    const votes = byAccount.find((b) => b.account_id === a.id)?.count || 0;
                    return (
                      <div
                        key={a.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-sm font-extrabold text-[#0b1f4b]">{a.label}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                            {votes} suara
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                          <span className="text-[11px] text-slate-500 sm:text-xs">
                            {a.has_token ? `Hint: ${a.token_hint}••••` : 'Belum ada token'}
                          </span>
                          <button
                            onClick={() => handleCreateToken(a.id)}
                            className="rounded-lg bg-[#0b1f4b] px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                          >
                            {a.has_token ? 'Reset' : 'Buat'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div
                  onClick={() => setActive('tokens')}
                  className="cursor-pointer rounded-2xl border border-blue-100 bg-blue-50/40 p-4 transition-all hover:bg-blue-50/70"
                >
                  <span className="text-xl">🎟️</span>
                  <h3 className="mt-1 font-bold text-[#0b1f4b]">Daftar Pemilih & Token</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Kelola {voters.length} token pemilih, cetak slip kartu atau unduh Excel.
                  </p>
                </div>

                <div
                  onClick={() => setActive('scoreboard')}
                  className="cursor-pointer rounded-2xl border border-amber-100 bg-amber-50/40 p-4 transition-all hover:bg-amber-50/70"
                >
                  <span className="text-xl">🏆</span>
                  <h3 className="mt-1 font-bold text-[#0b1f4b]">Scoreboard & Perolehan</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Umumkan hasil suara bertahap (reveal) atau ekspor laporan suara.
                  </p>
                </div>

                <div
                  onClick={() => setActive('pairs')}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-100"
                >
                  <span className="text-xl">👥</span>
                  <h3 className="mt-1 font-bold text-[#0b1f4b]">Pasangan Calon (Paslon)</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Ubah data profil, foto, dan visi misi 3 pasangan calon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DPT & TOKEN PEMILIH */}
          {active === 'tokens' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">DPT &amp; Token Pemilih</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Token unik 8 karakter untuk mencoblos di bilik suara.
                  </p>
                </div>

                {/* Mobile Export Buttons Grid */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <a
                    href="/api/export-voters?format=csv"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2 text-center text-xs font-bold text-white shadow-sm hover:bg-emerald-800 sm:px-3.5"
                  >
                    📥 Excel (CSV)
                  </a>
                  <a
                    href="/admin/cetak-token"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#0b1f4b] bg-white py-2 text-center text-xs font-bold text-[#0b1f4b] shadow-sm hover:bg-slate-50 sm:px-3.5"
                  >
                    🖨️ Cetak Slip (PDF)
                  </a>
                </div>
              </div>

              {/* Generator Box */}
              <div className="rounded-2xl border border-[#b0892f]/40 bg-[#fcfaf5] p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-[#0b1f4b]">⚡ Generator Batch Token</h3>
                  <span className="text-[11px] text-slate-500">Buat token massal (1 s.d. 300)</span>
                </div>

                <form onSubmit={handleGenerateVoters} className="mt-3.5 grid grid-cols-2 gap-2.5 sm:flex sm:items-end">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Nomor Awal</label>
                    <input
                      type="number"
                      min={1}
                      value={genFrom}
                      onChange={(e) => setGenFrom(Number(e.target.value))}
                      className="mt-1 w-full sm:w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#0b1f4b] focus:border-[#0b1f4b] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Nomor Akhir</label>
                    <input
                      type="number"
                      min={genFrom}
                      value={genTo}
                      onChange={(e) => setGenTo(Number(e.target.value))}
                      className="mt-1 w-full sm:w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#0b1f4b] focus:border-[#0b1f4b] focus:outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={genBusy}
                    className="col-span-2 sm:col-span-1 rounded-xl bg-[#0b1f4b] py-2.5 sm:py-2 px-4 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#142c63] disabled:opacity-50"
                  >
                    {genBusy ? 'Membuat…' : `Generate ${Math.max(0, genTo - genFrom + 1)} Token`}
                  </button>

                  <div className="col-span-2 flex items-center justify-between border-t border-slate-200/60 pt-2 sm:col-span-1 sm:border-0 sm:pt-0 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => { setGenFrom(1); setGenTo(300); }}
                      className="text-xs font-semibold text-slate-600 underline hover:text-[#0b1f4b]"
                    >
                      Set 1 - 300
                    </button>
                    {voters.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetVoters}
                        className="text-xs font-semibold text-red-600 underline hover:text-red-700 sm:ml-4"
                      >
                        Reset Semua DPT
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Filter and Search Bar */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {(['all', 'unused', 'used'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setVoterFilter(f)}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                          voterFilter === f
                            ? 'bg-[#0b1f4b] text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {f === 'all' && `Semua (${voters.length})`}
                        {f === 'unused' && `Belum (${votersStats.unused})`}
                        {f === 'used' && `Sudah (${votersStats.used})`}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari nomor, token, nama…"
                      value={voterSearch}
                      onChange={(e) => setVoterSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2 pl-3 pr-8 text-xs focus:border-[#0b1f4b] focus:outline-none"
                    />
                    {voterSearch && (
                      <button
                        onClick={() => setVoterSearch('')}
                        className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* MOBILE VIEW: Touch-Friendly Voter Cards */}
                <div className="space-y-2 md:hidden">
                  {filteredVoters.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                      {voters.length === 0
                        ? 'Belum ada token DPT. Klik "Generate" di atas.'
                        : 'Tidak ada pemilih yang cocok dengan pencarian.'}
                    </div>
                  ) : (
                    filteredVoters.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-extrabold text-[#0b1f4b]">
                            #{String(v.voter_no).padStart(3, '0')} · {v.name}
                          </span>
                          {v.is_used === 1 ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                              ✓ Sudah
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                              ● Belum
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between rounded-lg border border-[#b0892f]/30 bg-[#fbf8f2] px-3 py-2">
                          <span className="font-mono text-base font-extrabold tracking-[0.2em] text-[#0b1f4b]">
                            {v.token}
                          </span>
                          <button
                            onClick={() => copyToClipboard(v.token, `Token #${v.voter_no} tersalin!`)}
                            className="rounded-md bg-[#0b1f4b] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs active:scale-95"
                          >
                            {copiedToken === v.token ? '✓' : 'Salin'}
                          </button>
                        </div>

                        {(v.used_at || v.used_booth) && (
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Waktu: {v.used_at ? new Date(v.used_at.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID') : '—'}</span>
                            <span>{v.used_booth ? `Bilik ${v.used_booth}` : ''}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* DESKTOP VIEW: Full Data Table */}
                <div className="hidden md:block max-h-[28rem] overflow-y-auto rounded-xl border border-slate-200">
                  {filteredVoters.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      Tidak ada pemilih yang cocok.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-4 py-2.5">No. Urut</th>
                          <th className="px-4 py-2.5">Nama / Identitas</th>
                          <th className="px-4 py-2.5">Kode Token</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Waktu Coblos</th>
                          <th className="px-4 py-2.5">Bilik</th>
                          <th className="px-4 py-2.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredVoters.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 font-mono font-bold text-[#0b1f4b]">
                              #{String(v.voter_no).padStart(3, '0')}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">{v.name}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs font-extrabold tracking-widest text-[#0b1f4b]">
                                {v.token}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
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
                            <td className="px-4 py-2.5 text-slate-500">
                              {v.used_at ? new Date(v.used_at.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {v.used_booth ? `Bilik ${v.used_booth}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => copyToClipboard(v.token, `Token #${v.voter_no} tersalin!`)}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-[#0b1f4b] hover:bg-slate-100"
                              >
                                {copiedToken === v.token ? '✓ Tersalin' : '📋 Salin'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KONTROL SCOREBOARD */}
          {active === 'scoreboard' && (
            <div className="space-y-5 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">Kontrol Scoreboard Publik</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pengumuman bertahap (reveal) untuk menjaga antusiasme pemilihan.
                </p>
              </div>

              {/* Status Toggles Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#0b1f4b]">Scoreboard Publik</h3>
                    <p className="text-[11px] text-slate-500">Tampilkan hasil ke publik di /scoreboard.</p>
                  </div>
                  <button
                    onClick={() => handleToggleScoreboardPub(!scoreboardPubDraft)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-sm transition-all ${
                      scoreboardPubDraft
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {scoreboardPubDraft ? 'DIBUKA' : 'DITUTUP'}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#0b1f4b]">Bilik Voting</h3>
                    <p className="text-[11px] text-slate-500">Izinkan pemilih memasukkan token & memilih.</p>
                  </div>
                  <button
                    onClick={() => handleToggleVotingOpen(!votingOpenDraft)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-sm transition-all ${
                      votingOpenDraft
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {votingOpenDraft ? 'DIBUKA' : 'DITUTUP'}
                  </button>
                </div>
              </div>

              {/* Reveal Controller Box */}
              <div className="rounded-2xl border border-[#0b1f4b]/15 bg-[#fcfbf7] p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Suara Terungkap</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-extrabold text-[#0b1f4b]">
                        {scoreboard.revealed}
                      </span>
                      <span className="font-mono text-sm font-semibold text-slate-400">
                        / {scoreboard.total} total suara
                      </span>
                    </div>
                  </div>

                  {/* Step Buttons - Grid on Mobile */}
                  <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                    <button
                      onClick={() => handleStep(-1)}
                      disabled={scoreboard.revealed <= 0}
                      className="rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-[#0b1f4b] shadow-sm hover:bg-slate-50 disabled:opacity-40 sm:px-3"
                    >
                      − 1
                    </button>
                    <button
                      onClick={() => handleStep(1)}
                      disabled={scoreboard.revealed >= scoreboard.total}
                      className="rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-[#0b1f4b] shadow-sm hover:bg-slate-50 disabled:opacity-40 sm:px-3"
                    >
                      + 1
                    </button>
                    <button
                      onClick={() => handleStep(5)}
                      disabled={scoreboard.revealed >= scoreboard.total}
                      className="rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-[#0b1f4b] shadow-sm hover:bg-slate-50 disabled:opacity-40 sm:px-3"
                    >
                      + 5
                    </button>
                    <button
                      onClick={() => handleReveal(scoreboard.total)}
                      disabled={scoreboard.revealed >= scoreboard.total}
                      className="col-span-2 sm:col-span-1 rounded-xl bg-[#0b1f4b] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63] disabled:opacity-40 sm:px-3.5"
                    >
                      Reveal Semua
                    </button>
                    <button
                      onClick={() => handleReveal(0)}
                      disabled={scoreboard.revealed <= 0}
                      className="rounded-xl border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 sm:px-3"
                    >
                      Reset (0)
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Slider */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Persentase Diumumkan</span>
                    <span>
                      {scoreboard.total > 0
                        ? `${Math.round((scoreboard.revealed / scoreboard.total) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={scoreboard.total}
                    value={revealDraft}
                    onChange={(e) => setRevealDraft(Number(e.target.value))}
                    onMouseUp={() => handleReveal(revealDraft)}
                    onTouchEnd={() => handleReveal(revealDraft)}
                    className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0b1f4b]"
                  />
                </div>

                {/* Export Options */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#0b1f4b]/10 pt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Ekspor:</span>
                    <a
                      href="/api/export?format=csv"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1f4b] shadow-sm hover:bg-slate-50"
                    >
                      CSV
                    </a>
                    <a
                      href="/api/export?format=json"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1f4b] shadow-sm hover:bg-slate-50"
                    >
                      JSON
                    </a>
                  </div>

                  <Link
                    href="/scoreboard"
                    target="_blank"
                    className="text-xs font-bold text-[#0b1f4b] underline hover:text-[#b0892f]"
                  >
                    Buka Scoreboard Publik →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PASANGAN CALON (PAIRS) */}
          {active === 'pairs' && (
            <div className="space-y-5 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">Kelola Pasangan Calon</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Data 3 paslon yang tampil di beranda dan bilik suara.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
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
                          notify(`Pasangan Calon #${num} berhasil disimpan.`);
                          refresh();
                        } else {
                          notify(res.error || 'Gagal menyimpan.', 'error');
                        }
                      }}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all"
                    >
                      <input type="hidden" name="number" value={num} />

                      <div>
                        {/* Card Header with Number Badge */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="rounded-lg bg-[#0b1f4b] px-2.5 py-1 font-mono text-xs font-extrabold text-[#c9a64a]">
                            No. Urut {num}
                          </span>
                          <span className={`text-[11px] font-bold ${p?.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {p?.active ? '● Aktif' : '○ Nonaktif'}
                          </span>
                        </div>

                        {/* Photo Preview & Input */}
                        <div className="mt-3 flex flex-col items-center">
                          {photoDrafts[num] || p?.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoDrafts[num] || p?.photo_url}
                              alt={`Paslon ${num}`}
                              className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border border-slate-200 object-cover shadow-sm ring-2 ring-slate-100"
                            />
                          ) : (
                            <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-2xl font-bold text-slate-300">
                              {num}
                            </div>
                          )}

                          <label className="mt-2.5 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200">
                            Pilih Foto
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                if (f.size > 1_500_000) {
                                  alert('Ukuran foto maksimal 1.5 MB.');
                                  return;
                                }
                                const dataUrl = await readFileAsDataURL(f);
                                setPhotoDrafts((d) => ({ ...d, [num]: dataUrl }));
                              }}
                              className="hidden"
                            />
                          </label>
                          <input type="hidden" name="photo_url" value={photoDrafts[num] || p?.photo_url || ''} />
                        </div>

                        {/* Name Inputs */}
                        <div className="mt-3 space-y-2.5">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Calon Ketua
                            </label>
                            <input
                              name="chair_name"
                              defaultValue={p?.chair_name || ''}
                              placeholder="Nama Ketua"
                              required
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-[#0b1f4b] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Calon Wakil Ketua
                            </label>
                            <input
                              name="vice_name"
                              defaultValue={p?.vice_name || ''}
                              placeholder="Nama Wakil"
                              required
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-[#0b1f4b] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Visi / Slogan
                            </label>
                            <textarea
                              name="vision"
                              defaultValue={p?.vision || ''}
                              rows={2}
                              placeholder="Visi misi singkat…"
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-[#0b1f4b] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <input type="checkbox" name="active" defaultChecked={p ? p.active === 1 : true} />
                          Tampilkan di beranda
                        </label>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-xl bg-[#0b1f4b] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                          >
                            Simpan
                          </button>
                          {p && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`Hapus paslon nomor ${num}?`)) return;
                                const fd = new FormData();
                                fd.set('id', String(p.id));
                                await deletePairAction(fd);
                                notify(`Paslon #${num} dihapus.`);
                                refresh();
                              }}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: BERITA & PENGUMUMAN */}
          {active === 'news' && (
            <div className="space-y-5 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">Berita &amp; Informasi</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pengumuman resmi yang tampil di halaman /berita.
                </p>
              </div>

              {/* Form Tambah / Edit */}
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
                    notify(newsEdit.id ? 'Perubahan berita disimpan.' : 'Berita baru berhasil ditambahkan.');
                    setNewsEdit({ title: '', body: '', cover_url: '' });
                    setCoverDraft('');
                    refresh();
                  } else {
                    notify(res.error || 'Gagal menyimpan.', 'error');
                  }
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3"
              >
                <h3 className="text-xs sm:text-sm font-bold text-[#0b1f4b]">
                  {newsEdit.id ? '✏️ Edit Berita' : '➕ Tulis Berita Baru'}
                </h3>
                <input
                  name="title"
                  placeholder="Judul pengumuman / berita…"
                  required
                  value={newsEdit.title}
                  onChange={(e) => setNewsEdit({ ...newsEdit, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold focus:border-[#0b1f4b] focus:outline-none"
                />
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Isi berita lengkap…"
                  required
                  value={newsEdit.body}
                  onChange={(e) => setNewsEdit({ ...newsEdit, body: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm focus:border-[#0b1f4b] focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  {coverDraft || newsEdit.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverDraft || newsEdit.cover_url}
                      alt="cover"
                      className="h-12 w-16 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : null}
                  <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Gambar Sampul
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 1_500_000) {
                          alert('Ukuran gambar maksimal 1.5 MB.');
                          return;
                        }
                        setCoverDraft(await readFileAsDataURL(f));
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    className="ml-auto rounded-xl bg-[#0b1f4b] px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                  >
                    {newsEdit.id ? 'Simpan' : 'Terbitkan'}
                  </button>
                  {newsEdit.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewsEdit({ title: '', body: '', cover_url: '' });
                        setCoverDraft('');
                      }}
                      className="text-xs font-semibold text-slate-500 underline"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>

              {/* News List */}
              <div className="space-y-2.5">
                {news.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-serif text-sm sm:text-base font-bold text-[#0b1f4b]">{n.title}</span>
                        {n.featured ? (
                          <span className="rounded-full bg-[#0b1f4b] px-2 py-0.2 text-[9px] font-extrabold text-[#c9a64a]">
                            ★ Terkini
                          </span>
                        ) : null}
                        {n.is_new ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.2 text-[9px] font-extrabold text-red-700">
                            Baru
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.body}</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={async () => {
                          const fd = new FormData();
                          fd.set('id', String(n.id));
                          fd.set('flag', 'featured');
                          await toggleNewsFlagAction(fd);
                          refresh();
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          n.featured ? 'bg-[#c9a64a] text-[#0b1f4b]' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {n.featured ? 'Terkini' : 'Set Terkini'}
                      </button>
                      <button
                        onClick={() => {
                          setNewsEdit({ id: n.id, title: n.title, body: n.body, cover_url: n.cover_url || '' });
                          setCoverDraft('');
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Hapus berita "${n.title}"?`)) return;
                          const fd = new FormData();
                          fd.set('id', String(n.id));
                          await deleteNewsAction(fd);
                          notify('Berita dihapus.');
                          refresh();
                        }}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PANDUAN PEMILOS */}
          {active === 'panduan' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">Panduan Pemilos</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Peraturan yang tampil di halaman /panduan.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget as HTMLFormElement);
                  const res = await saveRulesAction(fd);
                  if (res.ok) {
                    notify('Panduan pemilos berhasil diperbarui.');
                    refresh();
                  } else {
                    notify(res.error || 'Gagal menyimpan.', 'error');
                  }
                }}
                className="space-y-3 sm:space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Judul Panduan</label>
                  <input
                    name="headline"
                    defaultValue={rules.headline}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold focus:border-[#0b1f4b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Poin Aturan (Tiap baris = 1 poin)
                  </label>
                  <textarea
                    name="body"
                    defaultValue={rules.body}
                    rows={8}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs leading-relaxed focus:border-[#0b1f4b] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0b1f4b] px-4 py-2 sm:px-5 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                  >
                    Simpan Panduan
                  </button>
                  <Link href="/panduan" target="_blank" className="text-xs font-bold text-[#0b1f4b] underline">
                    Lihat Publik →
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: LOG AUDIT */}
          {active === 'audit' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">Catatan Log Audit</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Seluruh rekaman aktivitas pemilu.
                </p>
              </div>

              {/* Mobile Audit List View */}
              <div className="space-y-2 md:hidden">
                {audit.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Belum ada aktivitas.</div>
                ) : (
                  audit.map((a) => {
                    const badgeColor =
                      a.action === 'VOTE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : a.action.includes('RESET')
                        ? 'bg-red-100 text-red-800'
                        : a.action.includes('OPEN')
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700';

                    return (
                      <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`rounded-md px-1.5 py-0.2 text-[9px] font-extrabold ${badgeColor}`}>
                            {a.action}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(a.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700">{a.detail}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block max-h-[30rem] overflow-y-auto rounded-xl border border-slate-200">
                {audit.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Belum ada aktivitas.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Aksi</th>
                        <th className="px-4 py-2.5">Keterangan</th>
                        <th className="px-4 py-2.5 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {audit.map((a) => {
                        const badgeColor =
                          a.action === 'VOTE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.action.includes('RESET')
                            ? 'bg-red-100 text-red-800'
                            : a.action.includes('OPEN')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700';

                        return (
                          <tr key={a.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-2.5 font-bold">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${badgeColor}`}>
                                {a.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">{a.detail}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-400">
                              {new Date(a.created_at.replace(' ', 'T') + 'Z').toLocaleString('id-ID')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: PENGATURAN & BRANDING */}
          {active === 'settings' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Identitas Organisasi */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget as HTMLFormElement);
                  const nextLogo = logoDraft || settings.logo_url || '';
                  fd.set('logo_url', nextLogo);
                  fd.set('mascot_url', mascotDraft || settings.mascot_url || '');
                  const res = await saveSettingsAction(fd);
                  if (res.ok) {
                    notify('Branding dan identitas organisasi berhasil disimpan.');
                    setLogoDraft('');
                    setMascotDraft('');
                    refresh();
                  } else {
                    notify(res.error || 'Gagal menyimpan branding.', 'error');
                  }
                }}
                className="space-y-3 sm:space-y-4"
              >
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#0b1f4b]">Identitas Sekolah &amp; Logo</h3>
                  <p className="text-xs text-slate-500">Tampil di header, cetak slip token, dan beranda.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Nama Organisasi</label>
                    <input
                      name="org_name"
                      defaultValue={settings.org_name}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold focus:border-[#0b1f4b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Subjudul / Nama Sekolah</label>
                    <input
                      name="org_subtitle"
                      defaultValue={settings.org_subtitle}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold focus:border-[#0b1f4b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Logo Resmi</label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <LogoSeal src={logoDraft || settings.logo_url} className="h-14 w-14 sm:h-16 sm:w-16 shadow-sm border border-slate-200" />
                      <div>
                        <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                          Ganti Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 1_500_000) {
                                alert('Ukuran logo maksimal 1.5 MB.');
                                return;
                              }
                              setLogoDraft(await readFileAsDataURL(f));
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="mt-1 text-[10px] text-slate-400">PNG/JPG (maks 1.5MB)</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Maskot Pengawas</label>
                    <div className="mt-1.5 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mascotDraft || settings.mascot_url || '/maskot.png'}
                        alt="maskot"
                        className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-slate-200 object-contain p-1"
                      />
                      <div>
                        <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                          Ganti Maskot
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 1_500_000) {
                                alert('Ukuran maskot maksimal 1.5 MB.');
                                return;
                              }
                              setMascotDraft(await readFileAsDataURL(f));
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="mt-1 text-[10px] text-slate-400">Tampil pada panduan & login</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-[#0b1f4b] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                >
                  Simpan Branding
                </button>
              </form>

              <hr className="border-slate-100" />

              {/* Ganti Password */}
              <form onSubmit={handleChangePw} className="space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#0b1f4b]">Keamanan &amp; Password</h3>
                  <p className="text-xs text-slate-500">Ganti kata sandi login admin pengawas.</p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    name="old"
                    type="password"
                    placeholder="Password lama"
                    required
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b1f4b] focus:outline-none"
                  />
                  <input
                    name="new"
                    type="password"
                    placeholder="Password baru (min 6 karakter)"
                    required
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0b1f4b] focus:outline-none"
                  />
                </div>

                <button
                  disabled={pwBusy}
                  className="rounded-xl bg-[#0b1f4b] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63] disabled:opacity-50"
                >
                  {pwBusy ? 'Menyimpan…' : 'Perbarui Password'}
                </button>
              </form>

              <hr className="border-slate-100" />

              {/* Danger Zone */}
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
                <h3 className="font-serif text-sm sm:text-base font-bold text-red-700">Zona Berbahaya (Reset Data)</h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Menghapus seluruh perolehan suara. Paslon dan data DPT tetap aman tersimpan.
                </p>
                <button
                  onClick={handleResetVotes}
                  className="mt-3 w-full sm:w-auto rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-600 shadow-sm hover:bg-red-50"
                >
                  ⚠️ Reset Seluruh Suara Masuk
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Tampilan Token Akun Fisik - Mobile Sheet / Centered */}
      {tokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#0b1f4b]">Token Akun Bilik {tokenModal.accountId}</h3>
            <p className="mt-1 text-xs text-slate-500">Salin dan berikan ke bilik suara.</p>
            <div className="mt-3.5 rounded-xl border border-[#b0892f]/40 bg-[#fcfaf5] py-2.5 font-mono text-2xl font-extrabold tracking-[0.25em] text-[#0b1f4b]">
              {tokenModal.token}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => copyToClipboard(tokenModal.token, 'Token bilik berhasil disalin!')}
                className="flex-1 rounded-xl bg-[#0b1f4b] py-2 text-xs font-bold text-white hover:bg-[#142c63]"
              >
                📋 Salin Token
              </button>
              <button
                onClick={() => setTokenModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
