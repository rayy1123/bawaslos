'use client';

import { useState, useEffect, useTransition } from 'react';
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
  controlTimerAction,
  setDisplayModeAction,
} from '@/lib/actions';
import type { Pair, NewsItem, Account, VoterRecord, TimerState, DisplayState, DisplayMode } from '@/lib/queries';
import LogoSeal from '@/components/LogoSeal';

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
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
  timer?: TimerState;
  display?: DisplayState;
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
  timer,
  display,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [active, setActive] = useState<'overview' | 'panggung' | 'timer' | 'tokens' | 'scoreboard' | 'pairs' | 'news' | 'panduan' | 'audit' | 'settings'>('overview');
  const [tokenModal, setTokenModal] = useState<{ accountId: number; token: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Live Timer Control State
  const [timerState, setTimerState] = useState<TimerState>(timer || {
    title: 'Sesi Debat & Tanya Jawab',
    speaker: 'all',
    duration: 120,
    remaining: 120,
    is_running: false,
    target_end: 0,
    server_now: Date.now(),
  });
  const [timerDisplayLeft, setTimerDisplayLeft] = useState<number>(timer?.remaining ?? 120);
  const [timerCustomMin, setTimerCustomMin] = useState<number>(2);
  const [timerCustomSec, setTimerCustomSec] = useState<number>(0);
  const [timerTitleInput, setTimerTitleInput] = useState<string>(timer?.title || 'Sesi Debat & Tanya Jawab');

  const [pwBusy, setPwBusy] = useState(false);
  const [revealDraft, setRevealDraft] = useState(scoreboard.revealed);
  const [votingOpenDraft, setVotingOpenDraft] = useState(votingOpen);
  const [scoreboardPubDraft, setScoreboardPubDraft] = useState(scoreboard.published);

  // Live Stage Display State (Banner / Scoreboard / Timer)
  const [displayMode, setDisplayMode] = useState<DisplayMode>(display?.mode || 'banner');
  const [displaySound, setDisplaySound] = useState<boolean>(display?.video_sound || false);
  const [displayBusy, setDisplayBusy] = useState<boolean>(false);

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

  const [showAddPair, setShowAddPair] = useState(false);
  const [addPairNumber, setAddPairNumber] = useState(3);
  const [addPhotoDraft, setAddPhotoDraft] = useState('');

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

  // 1. Polling sync with timer state
  useEffect(() => {
    let isSubscribed = true;
    async function syncTimer() {
      try {
        const res = await fetch('/api/timer', { cache: 'no-store' });
        if (res.ok && isSubscribed) {
          const data: TimerState = await res.json();
          setTimerState(data);
          if (data.is_running && data.target_end > 0) {
            setTimerDisplayLeft(Math.max(0, Math.round((data.target_end - Date.now()) / 1000)));
          } else {
            setTimerDisplayLeft(data.remaining);
          }
        }
      } catch {}
    }
    const interval = setInterval(syncTimer, 1000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // 1b. Polling sync with stage display state
  useEffect(() => {
    let isSubscribed = true;
    async function syncDisplay() {
      try {
        const res = await fetch('/api/display', { cache: 'no-store' });
        if (res.ok && isSubscribed) {
          const data: DisplayState = await res.json();
          setDisplayMode(data.mode);
          setDisplaySound(data.video_sound);
        }
      } catch {}
    }
    const interval = setInterval(syncDisplay, 1500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  async function handleSetDisplayMode(newMode: DisplayMode, sound = displaySound) {
    setDisplayBusy(true);
    setDisplayMode(newMode);
    const res = await setDisplayModeAction({ mode: newMode, video_sound: sound });
    setDisplayBusy(false);
    if (res.ok) {
      notify(`Layar panggung dialihkan ke: ${newMode.toUpperCase()}`);
    } else {
      notify(res.error || 'Gagal mengubah layar panggung.', 'error');
    }
  }

  async function handleToggleDisplaySound() {
    const nextSound = !displaySound;
    setDisplaySound(nextSound);
    await setDisplayModeAction({ mode: displayMode, video_sound: nextSound });
    notify(nextSound ? 'Audio video banner diaktifkan.' : 'Audio video banner dimatikan.');
  }

  // 2. High-precision local countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      if (timerState.is_running && timerState.target_end > 0) {
        setTimerDisplayLeft(Math.max(0, Math.round((timerState.target_end - Date.now()) / 1000)));
      } else {
        setTimerDisplayLeft(timerState.remaining);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [timerState.is_running, timerState.target_end, timerState.remaining]);

  async function handleTimerControl(
    action: 'start' | 'pause' | 'reset' | 'set' | 'adjust',
    opts?: { duration?: number; title?: string; speaker?: string; delta?: number }
  ) {
    const res = await controlTimerAction({ action, ...opts });
    if (res.ok && res.state) {
      setTimerState(res.state);
      setTimerDisplayLeft(res.state.remaining);
      notify(`Timer: ${action.toUpperCase()}`);
    } else {
      notify(res.error || 'Gagal mengubah timer.', 'error');
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
            { id: 'panggung', label: 'Kendali Panggung', icon: '🎬', badge: displayMode === 'banner' ? 'Banner' : displayMode === 'scoreboard' ? 'Scoreboard' : 'Timer' },
            { id: 'timer', label: 'Timer Debat', icon: '⏱️', badge: timerState.is_running ? '● Live' : undefined },
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

              {/* KENDALI LAYAR PANGGUNG (PROYEKTOR / TV) */}
              <div className="rounded-2xl border-2 border-[#b0892f] bg-gradient-to-r from-[#0b1f4b] via-[#112a5e] to-[#07132a] p-4 sm:p-5 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#c9a64a] px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-[#0b1f4b]">
                        KENDALI LAYAR PANGGUNG
                      </span>
                      <span className="text-xs text-slate-300">
                        Mode Aktif: <b className="text-[#c9a64a] uppercase">{displayMode}</b>
                      </span>
                    </div>
                    <h3 className="mt-1 font-serif text-base sm:text-lg font-bold">
                      Ganti Tampilan Layar Proyektor / TV Panggung
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-300">
                      Buka link{' '}
                      <Link href="/panggung" target="_blank" className="font-bold underline text-[#c9a64a]">
                        /panggung
                      </Link>{' '}
                      di laptop proyektor panggung (tekan F untuk Fullscreen).
                    </p>
                  </div>

                  {/* Remote Switcher Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={displayBusy}
                      onClick={() => handleSetDisplayMode('banner')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                        displayMode === 'banner'
                          ? 'bg-[#c9a64a] text-[#0b1f4b] shadow-lg ring-2 ring-white scale-102'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      🎬 Video Banner
                    </button>

                    <button
                      disabled={displayBusy}
                      onClick={() => handleSetDisplayMode('scoreboard')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                        displayMode === 'scoreboard'
                          ? 'bg-[#c9a64a] text-[#0b1f4b] shadow-lg ring-2 ring-white scale-102'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      📊 Scoreboard
                    </button>

                    <button
                      disabled={displayBusy}
                      onClick={() => handleSetDisplayMode('timer')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                        displayMode === 'timer'
                          ? 'bg-[#c9a64a] text-[#0b1f4b] shadow-lg ring-2 ring-white scale-102'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      ⏱️ Timer Debat
                    </button>

                    <Link
                      href="/panggung"
                      target="_blank"
                      className="rounded-xl border border-white/30 bg-white/10 p-2 text-white hover:bg-white/20"
                      title="Buka Layar Panggung di Tab Baru"
                    >
                      ↗
                    </Link>
                  </div>
                </div>
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  onClick={() => setActive('timer')}
                  className="cursor-pointer rounded-2xl border border-amber-200/80 bg-[#fbf6ea] p-4 transition-all hover:bg-[#f6ebd4]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">⏱️</span>
                    <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${timerState.is_running ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}`}>
                      {timerState.is_running ? '● Live' : 'Jeda'}
                    </span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#0b1f4b]">Timer Debat &amp; Tanya Jawab</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Kendalikan waktu layar panggung. Sisa: {String(Math.floor(timerDisplayLeft / 60)).padStart(2, '0')}:{String(timerDisplayLeft % 60).padStart(2, '0')}.
                  </p>
                </div>

                <div
                  onClick={() => setActive('tokens')}
                  className="cursor-pointer rounded-2xl border border-blue-100 bg-blue-50/40 p-4 transition-all hover:bg-blue-50/70"
                >
                  <span className="text-xl">🎟️</span>
                  <h3 className="mt-1 font-bold text-[#0b1f4b]">Daftar Pemilih &amp; Token</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Kelola {voters.length} token pemilih, cetak slip kartu atau unduh Excel.
                  </p>
                </div>

                <div
                  onClick={() => setActive('scoreboard')}
                  className="cursor-pointer rounded-2xl border border-amber-100 bg-amber-50/40 p-4 transition-all hover:bg-amber-50/70"
                >
                  <span className="text-xl">🏆</span>
                  <h3 className="mt-1 font-bold text-[#0b1f4b]">Scoreboard &amp; Perolehan</h3>
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
                    Ubah data profil, foto, dan visi misi {pairs.length} pasangan calon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KENDALI LAYAR PANGGUNG (PROYEKTOR / TV) */}
          {active === 'panggung' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">
                    Kendali Layar Panggung (Proyektor / TV)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ganti tampilan proyektor panggung secara langsung tanpa perlu login akun di laptop panggung.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/panggung"
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#c9a64a] px-4 py-2 text-xs font-black text-[#0b1f4b] shadow-sm hover:bg-[#d8b55c]"
                  >
                    <span>⛶ Buka Layar Panggung (/panggung)</span>
                    <span className="text-base">↗</span>
                  </Link>
                </div>
              </div>

              {/* Status Layar & Petunjuk Penggunaan */}
              <div className="rounded-2xl border border-[#b0892f]/40 bg-[#fcfaf5] p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status Saat Ini:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-serif text-xl font-black text-[#0b1f4b]">
                        {displayMode === 'banner' && '🎬 Video Banner (Auto-Repeat)'}
                        {displayMode === 'scoreboard' && '📊 Live Scoreboard'}
                        {displayMode === 'timer' && '⏱️ Timer Debat & Q&A'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 sm:text-right">
                    <p className="font-semibold text-[#0b1f4b]">Cara Kerja Tanpa Akun Tambahan:</p>
                    <p className="text-[11px] text-slate-500">
                      Buka <b>/panggung</b> di laptop proyektor, tekan <b>F</b> untuk Fullscreen. Dari sini, klik mode di bawah untuk mengganti tampilan secara instan.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 MODE TAMPILAN PANGGUNG */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* 1. Mode Video Banner */}
                <div
                  className={`flex flex-col justify-between rounded-2xl border-2 p-5 shadow-sm transition-all ${
                    displayMode === 'banner'
                      ? 'border-[#0b1f4b] bg-[#fbf6ea] ring-2 ring-[#c9a64a]/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">🎬</span>
                      {displayMode === 'banner' && (
                        <span className="rounded-full bg-[#0b1f4b] px-2.5 py-0.5 text-[10px] font-extrabold text-[#c9a64a]">
                          ● SEDANG TAMPIL
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-serif text-base font-bold text-[#0b1f4b]">
                      Video Banner Pemilos
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Memutar video animasi banner secara otomatis dan berulang tanpa bar kontrol. Cocok saat jeda acara atau pembukaan.
                    </p>
                  </div>

                  <div className="mt-5 space-y-2 border-t border-slate-200/60 pt-3">
                    <button
                      disabled={displayBusy || displayMode === 'banner'}
                      onClick={() => handleSetDisplayMode('banner')}
                      className={`w-full rounded-xl py-2 text-xs font-bold transition-all shadow-xs ${
                        displayMode === 'banner'
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-[#0b1f4b] text-white hover:bg-[#142c63]'
                      }`}
                    >
                      {displayMode === 'banner' ? '✓ Sedang Tampil di Panggung' : 'Tampilkan Video Banner'}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={handleToggleDisplaySound}
                        className="text-[11px] font-semibold text-slate-600 hover:text-[#0b1f4b] underline"
                      >
                        {displaySound ? '🔊 Suara: AKTIF' : '🔇 Suara: BISU (Muted)'}
                      </button>

                      <Link
                        href="/banner"
                        target="_blank"
                        className="text-[11px] font-bold text-[#0b1f4b] underline"
                        title="Buka Video Banner Standalone"
                      >
                        Buka /banner ↗
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 2. Mode Live Scoreboard */}
                <div
                  className={`flex flex-col justify-between rounded-2xl border-2 p-5 shadow-sm transition-all ${
                    displayMode === 'scoreboard'
                      ? 'border-[#0b1f4b] bg-[#fbf6ea] ring-2 ring-[#c9a64a]/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">📊</span>
                      {displayMode === 'scoreboard' && (
                        <span className="rounded-full bg-[#0b1f4b] px-2.5 py-0.5 text-[10px] font-extrabold text-[#c9a64a]">
                          ● SEDANG TAMPIL
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-serif text-base font-bold text-[#0b1f4b]">
                      Live Scoreboard Arena
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Menampilkan kartu kandidat paslon dan perolehan suara terungkap secara real-time dengan animasi bar pilar.
                    </p>
                  </div>

                  <div className="mt-5 space-y-2 border-t border-slate-200/60 pt-3">
                    <button
                      disabled={displayBusy || displayMode === 'scoreboard'}
                      onClick={() => handleSetDisplayMode('scoreboard')}
                      className={`w-full rounded-xl py-2 text-xs font-bold transition-all shadow-xs ${
                        displayMode === 'scoreboard'
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-[#0b1f4b] text-white hover:bg-[#142c63]'
                      }`}
                    >
                      {displayMode === 'scoreboard' ? '✓ Sedang Tampil di Panggung' : 'Tampilkan Scoreboard'}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setActive('scoreboard')}
                        className="text-[11px] font-semibold text-slate-600 hover:text-[#0b1f4b] underline"
                      >
                        Atur Reveal Suara →
                      </button>

                      <Link
                        href="/scoreboard"
                        target="_blank"
                        className="text-[11px] font-bold text-[#0b1f4b] underline"
                      >
                        Buka /scoreboard ↗
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 3. Mode Timer Debat */}
                <div
                  className={`flex flex-col justify-between rounded-2xl border-2 p-5 shadow-sm transition-all ${
                    displayMode === 'timer'
                      ? 'border-[#0b1f4b] bg-[#fbf6ea] ring-2 ring-[#c9a64a]/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">⏱️</span>
                      {displayMode === 'timer' && (
                        <span className="rounded-full bg-[#0b1f4b] px-2.5 py-0.5 text-[10px] font-extrabold text-[#c9a64a]">
                          ● SEDANG TAMPIL
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-serif text-base font-bold text-[#0b1f4b]">
                      Timer Debat &amp; Tanya Jawab
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Menampilkan satu timer hitung mundur raksasa dan sorotan giliran bicara paslon/moderator di panggung.
                    </p>
                  </div>

                  <div className="mt-5 space-y-2 border-t border-slate-200/60 pt-3">
                    <button
                      disabled={displayBusy || displayMode === 'timer'}
                      onClick={() => handleSetDisplayMode('timer')}
                      className={`w-full rounded-xl py-2 text-xs font-bold transition-all shadow-xs ${
                        displayMode === 'timer'
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-[#0b1f4b] text-white hover:bg-[#142c63]'
                      }`}
                    >
                      {displayMode === 'timer' ? '✓ Sedang Tampil di Panggung' : 'Tampilkan Timer'}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setActive('timer')}
                        className="text-[11px] font-semibold text-slate-600 hover:text-[#0b1f4b] underline"
                      >
                        Kendalikan Waktu →
                      </button>

                      <Link
                        href="/timer"
                        target="_blank"
                        className="text-[11px] font-bold text-[#0b1f4b] underline"
                      >
                        Buka /timer ↗
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TIMER PANGGUNG DEBAT & PERTANYAAN */}
          {active === 'timer' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">
                    Kontrol Timer Panggung Debat &amp; Pertanyaan
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Kendalikan satu timer besar di layar proyektor / panggung secara fleksibel dan real-time.
                  </p>
                </div>

                <Link
                  href="/timer"
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a64a] px-4 py-2 text-xs font-black text-[#0b1f4b] shadow-sm hover:bg-[#d8b55c] active:scale-95"
                >
                  <span>⛶ Buka Layar Panggung (/timer)</span>
                  <span className="text-base">↗</span>
                </Link>
              </div>

              {/* LIVE MONITOR PREVIEW & PRIMARY CONTROLS */}
              <div className="rounded-2xl border-2 border-[#0b1f4b] bg-gradient-to-b from-[#07132a] to-[#040b17] p-5 text-white shadow-lg">
                <div className="flex flex-col items-center justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      {timerState.is_running && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      )}
                      <span className={`relative inline-flex h-3 w-3 rounded-full ${timerState.is_running ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </span>
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#c9a64a]">
                      {timerState.is_running ? 'TIMER SEDANG BERJALAN' : 'TIMER DIJEDA / SIAP'}
                    </span>
                  </div>

                  <span className="text-xs font-medium text-slate-300">
                    Sesi: <b className="text-white">{timerState.title}</b>
                  </span>
                </div>

                {/* Mirror Countdown Digits */}
                <div className="my-5 select-none text-center sm:my-7">
                  <div className="font-mono text-6xl font-black tracking-tight text-white drop-shadow-md sm:text-8xl">
                    {String(Math.floor(timerDisplayLeft / 60)).padStart(2, '0')}:
                    {String(timerDisplayLeft % 60).padStart(2, '0')}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Durasi Acuan: {Math.floor(timerState.duration / 60)}m {timerState.duration % 60 > 0 ? `${timerState.duration % 60}s` : ''} · Pembicara:{' '}
                    <span className="font-bold text-[#c9a64a]">
                      {timerState.speaker.startsWith('paslon-')
                        ? `Paslon ${timerState.speaker.replace('paslon-', '')}`
                        : timerState.speaker === 'mod'
                        ? 'Moderator'
                        : 'Semua'}
                    </span>
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => handleTimerControl(timerState.is_running ? 'pause' : 'start')}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-black tracking-wider transition-all shadow-md active:scale-95 ${
                      timerState.is_running
                        ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                        : 'bg-emerald-500 text-white hover:bg-emerald-400 ring-2 ring-emerald-300/50'
                    }`}
                  >
                    <span>{timerState.is_running ? '⏸ JEDA TIMER' : '▶ MULAI TIMER'}</span>
                  </button>

                  <button
                    onClick={() => handleTimerControl('reset')}
                    className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 active:scale-95"
                  >
                    ↺ Reset
                  </button>

                  <div className="ml-0 flex items-center gap-1.5 sm:ml-2">
                    <button
                      onClick={() => handleTimerControl('adjust', { delta: 30 })}
                      className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/20"
                      title="Tambah 30 Detik"
                    >
                      +30s
                    </button>
                    <button
                      onClick={() => handleTimerControl('adjust', { delta: 15 })}
                      className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/20"
                      title="Tambah 15 Detik"
                    >
                      +15s
                    </button>
                    <button
                      onClick={() => handleTimerControl('adjust', { delta: -10 })}
                      className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/20"
                      title="Kurang 10 Detik"
                    >
                      -10s
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: ATUR DURASI FLEKSIBEL & CEPAT */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                <h3 className="font-serif text-sm sm:text-base font-bold text-[#0b1f4b]">1. Atur Durasi Waktu</h3>
                <p className="text-xs text-slate-500">Pilih durasi cepat atau masukkan durasi kustom (menit:detik).</p>

                {/* Preset Buttons Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {[
                    { label: '15 Detik', sec: 15, note: 'Tanya Cepat' },
                    { label: '30 Detik', sec: 30, note: 'Klarifikasi' },
                    { label: '45 Detik', sec: 45, note: 'Baca Soal' },
                    { label: '1 Menit', sec: 60, note: 'Sanggahan' },
                    { label: '90 Detik', sec: 90, note: 'Menjawab' },
                    { label: '2 Menit', sec: 120, note: 'Debat' },
                    { label: '3 Menit', sec: 180, note: 'Visi Misi' },
                  ].map((p) => (
                    <button
                      key={p.sec}
                      onClick={() => handleTimerControl('set', { duration: p.sec })}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                        timerState.duration === p.sec
                          ? 'border-[#0b1f4b] bg-[#0b1f4b] text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="font-mono text-xs sm:text-sm font-black">{p.label}</span>
                      <span className="text-[9px] opacity-75">{p.note}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Time Input */}
                <div className="mt-3.5 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Menit</label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={timerCustomMin}
                      onChange={(e) => setTimerCustomMin(Math.max(0, Number(e.target.value)))}
                      className="mt-1 w-16 sm:w-20 rounded-xl border border-slate-200 p-1.5 sm:p-2 text-center font-mono text-sm font-bold focus:border-[#0b1f4b] focus:outline-none"
                    />
                  </div>
                  <span className="pb-1.5 text-lg font-bold text-slate-400">:</span>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Detik</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={timerCustomSec}
                      onChange={(e) => setTimerCustomSec(Math.max(0, Math.min(59, Number(e.target.value))))}
                      className="mt-1 w-16 sm:w-20 rounded-xl border border-slate-200 p-1.5 sm:p-2 text-center font-mono text-sm font-bold focus:border-[#0b1f4b] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const totalSec = timerCustomMin * 60 + timerCustomSec;
                      if (totalSec > 0) {
                        handleTimerControl('set', { duration: totalSec });
                      }
                    }}
                    className="rounded-xl bg-[#0b1f4b] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                  >
                    Terapkan Waktu Kustom
                  </button>
                </div>
              </div>

              {/* SECTION: ATUR JUDUL SESI & PEMBICARA */}
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {/* Sesi Title */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#0b1f4b]">2. Judul Sesi / Kategori</h3>
                  <p className="text-xs text-slate-500">Teks ini tampil di atas angka timer layar panggung.</p>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={timerTitleInput}
                      onChange={(e) => setTimerTitleInput(e.target.value)}
                      placeholder="Contoh: Sesi 1 - Penyampaian Visi Misi"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#0b1f4b] focus:outline-none"
                    />
                    <button
                      onClick={() => handleTimerControl('set', { title: timerTitleInput })}
                      className="shrink-0 rounded-xl bg-[#0b1f4b] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                    >
                      Ubah
                    </button>
                  </div>

                  {/* Preset Titles */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[
                      'Sesi 1: Visi & Misi',
                      'Sesi 2: Tanya Jawab Panelis',
                      'Sesi 3: Debat Terbuka Antar Paslon',
                      'Sesi 4: Closing Statement',
                    ].map((title) => (
                      <button
                        key={title}
                        onClick={() => {
                          setTimerTitleInput(title);
                          handleTimerControl('set', { title });
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speaker Selector */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#0b1f4b]">3. Sorot Pembicara Aktif</h3>
                  <p className="text-xs text-slate-500">Tampilkan giliran kandidat yang sedang berbicara di panggung.</p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTimerControl('set', { speaker: 'all' })}
                      className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                        timerState.speaker === 'all'
                          ? 'border-[#0b1f4b] bg-[#0b1f4b] text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      ⚖️ Semua / Netral
                    </button>

                    <button
                      onClick={() => handleTimerControl('set', { speaker: 'mod' })}
                      className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                        timerState.speaker === 'mod'
                          ? 'border-[#b0892f] bg-[#fbf6ea] text-[#0b1f4b] ring-2 ring-[#c9a64a]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      🎙️ Moderator
                    </button>

                    {pairs.map((p) => (
                      <button
                        key={p.number}
                        onClick={() => handleTimerControl('set', { speaker: `paslon-${p.number}` })}
                        className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                          timerState.speaker === `paslon-${p.number}`
                            ? 'border-[#0b1f4b] bg-[#0b1f4b] text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                        }`}
                      >
                        Paslon {p.number}: {p.chair_name}
                      </button>
                    ))}
                  </div>
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
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#0b1f4b]">
                    Kelola Pasangan Calon ({pairs.length} Paslon Terdaftar)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nama Paslon 1 dan 2 sudah tersimpan. Klik &quot;Ganti Foto&quot; untuk mengganti foto kandidat.
                  </p>
                </div>
                {!showAddPair && pairs.length < 5 && (
                  <button
                    onClick={() => {
                      const nextNum = Math.max(0, ...pairs.map((x) => x.number)) + 1;
                      setAddPairNumber(nextNum);
                      setShowAddPair(true);
                    }}
                    className="self-start rounded-xl border border-[#0b1f4b] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0b1f4b] shadow-xs hover:bg-slate-50 sm:self-auto"
                  >
                    + Tambah Paslon Baru
                  </button>
                )}
              </div>

              {/* Form Tambah Paslon Baru (Hanya jika admin mengklik tombol Tambah) */}
              {showAddPair && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    fd.set('number', String(addPairNumber));
                    fd.set('photo_url', addPhotoDraft || '');
                    fd.set('active', 'on');
                    const res = await savePairAction(fd);
                    if (res.ok) {
                      notify(`Pasangan Calon #${addPairNumber} berhasil ditambahkan.`);
                      setShowAddPair(false);
                      setAddPhotoDraft('');
                      refresh();
                    } else {
                      notify(res.error || 'Gagal menambahkan paslon.', 'error');
                    }
                  }}
                  className="rounded-2xl border-2 border-dashed border-[#b0892f]/50 bg-[#fbf8f2] p-4 sm:p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-serif text-sm font-bold text-[#0b1f4b]">
                      ➕ Tambah Pasangan Calon No. Urut {addPairNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddPair(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Batal ✕
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Nomor Urut
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={addPairNumber}
                        onChange={(e) => setAddPairNumber(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold focus:border-[#0b1f4b] focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Foto Paslon
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        {addPhotoDraft ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={addPhotoDraft} alt="Preview" className="h-10 w-10 rounded-lg object-cover border" />
                        ) : null}
                        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Pilih Foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const compressed = await compressImageFile(f);
                              setAddPhotoDraft(compressed);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Nama Calon Ketua
                      </label>
                      <input
                        name="chair_name"
                        placeholder="Nama Ketua"
                        required
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-[#0b1f4b] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Nama Calon Wakil Ketua
                      </label>
                      <input
                        name="vice_name"
                        placeholder="Nama Wakil"
                        required
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-[#0b1f4b] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Visi / Slogan
                      </label>
                      <textarea
                        name="vision"
                        rows={2}
                        placeholder="Visi misi singkat…"
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-[#0b1f4b] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-[#0b1f4b] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                    >
                      Simpan Paslon Baru
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPair(false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Daftar Paslon yang Ada di Database */}
              {pairs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                  Belum ada pasangan calon terdaftar. Klik &quot;+ Tambah Paslon Baru&quot; di atas.
                </div>
              ) : (
                <div className={`grid gap-4 ${pairs.length === 2 ? 'max-w-4xl sm:grid-cols-2' : 'sm:grid-cols-3'} sm:gap-5`}>
                  {pairs.map((p) => (
                    <form
                      key={p.id}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget as HTMLFormElement);
                        const res = await savePairAction(fd);
                        if (res.ok) {
                          notify(`Paslon #${p.number} (${p.chair_name} & ${p.vice_name}) berhasil disimpan.`);
                          refresh();
                        } else {
                          notify(res.error || 'Gagal menyimpan.', 'error');
                        }
                      }}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-[#0b1f4b]/30"
                    >
                      <input type="hidden" name="number" value={p.number} />

                      <div>
                        {/* Card Header with Number Badge */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="rounded-lg bg-[#0b1f4b] px-2.5 py-1 font-mono text-xs font-extrabold text-[#c9a64a]">
                            No. Urut {p.number}
                          </span>
                          <span className={`text-[11px] font-bold ${p.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {p.active ? '● Aktif di Pemilihan' : '○ Nonaktif'}
                          </span>
                        </div>

                        {/* Photo Preview & Input */}
                        <div className="mt-3.5 flex flex-col items-center">
                          {photoDrafts[p.number] || p.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoDrafts[p.number] || p.photo_url}
                              alt={`Paslon ${p.number}`}
                              className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl border-2 border-[#b0892f]/40 object-cover shadow-sm ring-2 ring-slate-100"
                            />
                          ) : (
                            <div className="flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-2xl font-bold text-slate-300">
                              {p.number}
                            </div>
                          )}

                          <div className="mt-2.5 flex flex-col items-center gap-1">
                            <label className="cursor-pointer rounded-xl border border-[#0b1f4b] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0b1f4b] shadow-xs hover:bg-slate-50 active:scale-95 transition-all">
                              📷 Ganti Foto Paslon {p.number}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  try {
                                    const compressed = await compressImageFile(f);
                                    setPhotoDrafts((d) => ({ ...d, [p.number]: compressed }));
                                    notify(`Foto baru Paslon #${p.number} dipilih. Klik "Simpan" untuk menerapkan.`);
                                  } catch {
                                    alert('Gagal memproses foto.');
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            {photoDrafts[p.number] && (
                              <span className="text-[10px] font-bold text-emerald-600">✓ Foto baru siap disimpan</span>
                            )}
                            <input type="hidden" name="photo_url" value={photoDrafts[p.number] || p.photo_url || ''} />
                          </div>
                        </div>

                        {/* Name Inputs - Andi & Budi, Citra & Dewi */}
                        <div className="mt-3.5 space-y-2.5">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Calon Ketua
                            </label>
                            <input
                              name="chair_name"
                              defaultValue={p.chair_name}
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
                              defaultValue={p.vice_name}
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
                              defaultValue={p.vision || ''}
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
                          <input type="checkbox" name="active" defaultChecked={p.active === 1} />
                          Tampilkan di pemilihan
                        </label>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-xl bg-[#0b1f4b] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63]"
                          >
                            Simpan Paslon {p.number}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Hapus Pasangan Calon #${p.number} (${p.chair_name} & ${p.vice_name})?`)) return;
                              const fd = new FormData();
                              fd.set('id', String(p.id));
                              fd.set('number', String(p.number));
                              const res = await deletePairAction(fd);
                              if (res.ok) {
                                notify(`Paslon #${p.number} berhasil dihapus.`);
                                refresh();
                              } else {
                                notify(res.error || 'Gagal menghapus.', 'error');
                              }
                            }}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </form>
                  ))}
                </div>
              )}
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
