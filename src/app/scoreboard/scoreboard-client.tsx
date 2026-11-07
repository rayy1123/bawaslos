'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Settings } from '@/lib/queries';
import LogoSeal from '@/components/LogoSeal';

type TallyRow = {
  pair_id: number;
  number: number;
  chair_name: string;
  vice_name: string;
  photo_url: string;
  votes: number;
};

type Props = {
  initialTally: TallyRow[];
  total: number;
  revealedInit: number;
  settings?: Settings;
};

// Warna tiap paslon (navy / gold / navy-container) ala Civic Excellence.
const ACCENTS = ['#1B2E4B', '#C5A059', '#26415f'];

type ApiData = {
  published: boolean;
  revealed: number;
  total: number;
  tally: TallyRow[];
};

// Count-up halus saat angka berubah.
function useCountUp(value: number, ms = 0) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const raf = useRef<number>();
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    if (ms <= 0) { setDisplay(to); fromRef.current = to; return; }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, ms]);
  return display;
}

function BigNum({ value }: { value: number }) {
  const v = useCountUp(value);
  return <span className="font-mono-num">{v.toLocaleString('id-ID')}</span>;
}

export default function ScoreboardClient({ initialTally, total, revealedInit, settings }: Props) {
  const [api, setApi] = useState<ApiData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch('/api/scoreboard', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as ApiData;
        if (alive) setApi(data);
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(() => { tick(); }, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  const livePublished = api ? api.published : true;
  const liveTotal = api ? api.total : total;
  const liveRevealed = api ? api.revealed : revealedInit;
  const liveTally = api ? api.tally : initialTally;

  const currentTally = useMemo(() => liveTally, [liveTally]);
  const totalVotes = liveTotal;
  const leader = currentTally.reduce(
    (a, b) => (b.votes > a.votes ? b : a),
    currentTally[0] || { votes: -1, chair_name: '', vice_name: '', number: 0 }
  );
  const isFinal = liveRevealed >= liveTotal && liveTotal > 0 && totalVotes > 0;

  if (!livePublished) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-center font-sans bg-[#f8f9fa]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-lg space-y-4">
          <span className="text-4xl">🔒</span>
          <h1 className="font-serif text-2xl font-bold text-[#1B2E4B]">Scoreboard Ditutup</h1>
          <p className="text-sm text-slate-600">
            Scoreboard sedang ditutup oleh pengawas. Silakan kembali saat hasil dibuka.
          </p>
          <div className="pt-2">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b1f4b] px-5 py-2 text-xs font-bold text-white hover:bg-[#142c63]">
              ← Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="arena-grid relative min-h-screen h-screen max-h-screen w-screen overflow-hidden flex flex-col justify-between p-3 sm:p-5 lg:p-6 bg-[#f8f9fa] select-none"
    >
      {/* 1. COMPACT TOP HEADER: Title & Quick Stats (Takes minimal vertical space) */}
      <header className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          <LogoSeal src={settings?.logo_url} className="h-10 w-10 sm:h-12 sm:w-12 shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#b0892f]">
                {settings?.org_name || 'BAWASLOS'} · SMKN 64 JAKARTA
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-extrabold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                Live Update
              </span>
            </div>
            <h1 className="font-serif text-lg sm:text-2xl font-black tracking-tight text-[#1B2E4B] uppercase">
              WHO WILL LEAD US?
            </h1>
          </div>
        </div>

        {/* Compact Horizontal Total Suara Pill & Controls */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="inline-flex items-center gap-3 bg-[#1B2E4B] px-4 py-1.5 rounded-2xl shadow-md border border-[#C5A059]/30 text-white">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#e9c176]">
              Total Suara:
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white">
              <BigNum value={totalVotes} />
            </span>
            <span className="text-[10px] sm:text-xs text-white/60 font-mono">
              ({liveRevealed}/{liveTotal} diumumkan)
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            title="Layar Penuh (F)"
          >
            ⛶
          </button>

          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#0b1f4b] shadow-xs hover:bg-slate-50"
            title="Kembali ke Beranda"
          >
            Beranda
          </Link>
        </div>
      </header>

      {/* 2. CENTER: FIT-TO-SCREEN CANDIDATE CARDS (NO SCROLL NEEDED) */}
      <main className="relative z-10 my-auto w-full max-w-5xl mx-auto flex items-center justify-center py-2 sm:py-4">
        <div className={`w-full grid grid-cols-1 ${currentTally.length === 2 ? 'sm:grid-cols-2 max-w-4xl' : 'sm:grid-cols-3'} gap-4 sm:gap-6 lg:gap-8 items-stretch`}>
          {currentTally.map((row, idx) => {
            const pct = (row.votes / totalVotes) * 100;
            const accent = ACCENTS[idx % ACCENTS.length];
            const revealed = liveRevealed > 0;

            return (
              <div
                key={row.pair_id}
                className="flex flex-col justify-between w-full bg-white rounded-2xl p-4 sm:p-5 lg:p-6 shadow-md border border-slate-200/90 relative overflow-hidden"
              >
                {/* Top Accent Strip */}
                <div className="absolute top-0 left-0 w-full h-2" style={{ background: accent }} />

                {/* Candidate Photo & Names Row */}
                <div className="flex items-center gap-3.5 sm:gap-4">
                  {/* Square Photo Frame with Number Badge */}
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36 rounded-xl overflow-hidden border-2 border-slate-200 bg-white shrink-0 shadow-xs">
                    {row.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="w-full h-full object-cover object-center"
                        src={row.photo_url}
                        alt={`Paslon ${row.number}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[#1B2E4B]/30 font-serif">
                        {row.chair_name?.[0] ?? '?'}
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 rounded-md bg-[#0b1f4b] px-2 py-0.5 text-[10px] font-mono font-black text-[#c9a64a] shadow-xs">
                      NO. {String(row.number).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Candidate Info */}
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Paslon {String(row.number).padStart(2, '0')}
                    </span>
                    <h2 className="font-serif text-base sm:text-lg lg:text-xl font-black text-[#1B2E4B] leading-tight truncate">
                      {row.chair_name || '—'}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate">
                      &amp; {row.vice_name || '—'}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-slate-700">
                      {revealed ? `${row.votes.toLocaleString('id-ID')} Suara Sah` : 'Menunggu Reveal'}
                    </div>
                  </div>
                </div>

                {/* Percentage & Pillar Bar (Compact & Proportional) */}
                <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Perolehan
                    </span>
                    <span className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black leading-none" style={{ color: accent }}>
                      {revealed ? `${Math.round(pct)}%` : '—'}
                    </span>
                  </div>

                  {/* Vertical Pillar Bar */}
                  <div className="h-24 sm:h-28 lg:h-32 w-14 sm:w-16 lg:w-20 bg-slate-100 rounded-t-xl overflow-hidden border border-slate-200 relative flex items-end shadow-inner">
                    <div
                      className="w-full rounded-t-lg transition-all duration-1000 ease-out"
                      style={{
                        height: revealed ? `${pct}%` : '0%',
                        background: accent,
                        boxShadow: `0 0 12px ${accent}80`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 3. BOTTOM COMPACT STATUS STRIP */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/80 pt-2 text-[11px] text-slate-500">
        <div>
          {isFinal ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-[#1B2E4B]">
              🏆 HASIL AKHIR RESMI: Paslon {String(leader.number).padStart(2, '0')} memimpin dengan {leader.votes.toLocaleString('id-ID')} suara sah.
            </span>
          ) : (
            <span>
              ● Rekapitulasi suara sah diawasi oleh Badan Pengawas Pemilihan OSIS SMK Negeri 64 Jakarta.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pemenang" className="font-bold text-[#1B2E4B] hover:text-[#C5A059] underline">
            🏆 Sorot Pemenang
          </Link>
          <span className="font-mono text-[10px] text-slate-400">
            [F: Fullscreen]
          </span>
        </div>
      </footer>
    </div>
  );
}
