'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { Pair, Settings, DisplayState } from '@/lib/queries';
import MpkLogo from '@/components/MpkLogo';

type Props = {
  pairs: Pair[];
  settings: Settings;
  scoreboard: {
    published: boolean;
    revealed: number;
    total: number;
    tally: {
      pair_id: number;
      number: number;
      chair_name: string;
      vice_name: string;
      photo_url: string;
      votes: number;
    }[];
  };
  display?: DisplayState;
};

export default function PemenangClient({
  pairs,
  settings,
  scoreboard,
  display,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveTally, setLiveTally] = useState(scoreboard.tally);
  const [liveTotal, setLiveTotal] = useState(scoreboard.total);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll for scoreboard updates
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch('/api/scoreboard', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data.tally) {
          setLiveTally(data.tally);
          setLiveTotal(data.total || 0);
        }
      } catch {
        // Ignore network hiccups
      }
    };
    const interval = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Determine the winner (highest votes)
  const winnerData = useMemo(() => {
    if (!liveTally || liveTally.length === 0) return null;
    const sorted = [...liveTally].sort((a, b) => b.votes - a.votes);
    const top = sorted[0];
    const second = sorted[1];
    const isTie = top && second && top.votes === second.votes && top.votes > 0;
    const fullPairInfo = pairs.find((p) => p.number === top.number) || top;

    const totalVotesCount = liveTotal || 1;
    const percent = Math.round((top.votes / totalVotesCount) * 100);

    return {
      pair: fullPairInfo,
      votes: top.votes,
      percent,
      isTie,
      hasVotes: top.votes > 0,
    };
  }, [liveTally, pairs, liveTotal]);

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

  const winner = winnerData?.pair;

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="relative min-h-screen h-screen w-screen overflow-hidden bg-gradient-to-b from-[#030a17] via-[#071630] to-[#02060f] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none"
    >
      {/* 1. Celebratory Golden Halo & Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#c9a64a]/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[#0b1f4b]/40 blur-3xl" />

      {/* Floating Sparkle Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <span className="absolute top-1/4 left-1/6 text-2xl animate-bounce">✨</span>
        <span className="absolute top-1/3 right-1/5 text-xl animate-pulse">⭐</span>
        <span className="absolute bottom-1/4 left-1/4 text-xl animate-pulse">✨</span>
        <span className="absolute bottom-1/3 right-1/6 text-2xl animate-bounce">⭐</span>
      </div>

      {/* 2. TOP HEADER: Clean Official Seal + Session Title */}
      <header className="relative z-10 flex items-center justify-between pb-2">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <MpkLogo
            src={settings.logo_url}
            className="h-14 w-14 sm:h-18 sm:w-18"
            showText={false}
            animated={true}
          />
          <div>
            <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-[#c9a64a]">
              MPK SMKN 64 JAKARTA · BAWASLOS
            </span>
            <p className="font-serif text-sm sm:text-base font-semibold text-slate-300">
              Hasil Akhir Resmi Pemilihan Ketua &amp; Wakil Ketua OSIS
            </p>
          </div>
        </div>

        {/* Subtle Ghost Controls (Hover only) */}
        <div className="flex items-center gap-2 opacity-25 hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-sm text-white/80 hover:text-white hover:bg-white/10"
            title="Layar Penuh (F)"
          >
            ⛶
          </button>
          <Link
            href="/admin"
            className="rounded-lg p-2 text-sm text-white/80 hover:text-white hover:bg-white/10"
            title="Dashboard Admin"
          >
            ⚙️
          </Link>
          <Link
            href="/"
            className="rounded-lg p-2 text-sm text-white/80 hover:text-white hover:bg-white/10"
            title="Beranda"
          >
            ⌂
          </Link>
        </div>
      </header>

      {/* 3. CENTER: MAGNIFICENT WINNER SPOTLIGHT CARD */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-4">
        {/* Celebration Trophy & Badge */}
        <div className="flex flex-col items-center mb-3 sm:mb-4 animate-fade-up">
          <div className="flex items-center justify-center mb-1">
            <span className="text-4xl sm:text-5xl lg:text-6xl drop-shadow-[0_0_25px_rgba(201,166,74,0.6)] animate-bounce">
              🏆
            </span>
          </div>

          <span className="inline-block rounded-full border border-[#c9a64a]/50 bg-[#0b1f4b]/90 px-4 sm:px-6 py-1 font-mono text-[11px] sm:text-xs font-black tracking-widest text-[#c9a64a] uppercase shadow-lg backdrop-blur-md">
            ★ PASANGAN CALON TERPILIH PERIODE 2026/2027 ★
          </span>

          <h2 className="mt-2 font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
            SELAMAT ATAS TERPILIHNYA
          </h2>
        </div>

        {/* Winner Hero Card */}
        {winnerData?.isTie ? (
          <div className="rounded-3xl border-2 border-amber-400 bg-[#0b1f4b]/80 p-8 shadow-2xl backdrop-blur-md max-w-lg">
            <h3 className="font-serif text-2xl font-bold text-amber-300">Perolehan Suara Masih Imbang</h3>
            <p className="mt-2 text-sm text-slate-300">
              Kedua pasangan calon saat ini memperoleh jumlah suara yang sama ({winnerData.votes} suara).
            </p>
          </div>
        ) : winner ? (
          <div className="group relative flex flex-col items-center animate-fade-up">
            {/* Square Frame Photo of Winner with Glowing Gold Border */}
            <div className="relative mb-4">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#b0892f] via-[#c9a64a] to-[#e9c176] opacity-75 blur-md animate-pulse" />
              <div className="relative h-44 w-44 sm:h-56 sm:w-56 lg:h-64 lg:w-64 overflow-hidden rounded-2xl border-4 border-[#c9a64a] bg-slate-900 shadow-2xl">
                {winner.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winner.photo_url}
                    alt={`Paslon ${winner.number}`}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-5xl font-black text-[#c9a64a]">
                    {winner.number}
                  </div>
                )}
                {/* Number Badge */}
                <div className="absolute top-2.5 left-2.5 rounded-lg bg-[#0b1f4b] px-3 py-1 text-xs sm:text-sm font-mono font-black text-[#c9a64a] shadow-md border border-[#c9a64a]/50">
                  NO. {String(winner.number).padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Candidate Names in Grand Typography */}
            <h3 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
              {winner.chair_name} &amp; {winner.vice_name}
            </h3>
            <p className="mt-1 font-serif text-sm sm:text-lg font-bold text-[#c9a64a] tracking-wide">
              Ketua &amp; Wakil Ketua OSIS Terpilih
            </p>

            {/* Victory Statistics Pill */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Perolehan Suara</span>
                <span className="font-mono text-lg sm:text-2xl font-black text-white">
                  {winnerData.votes.toLocaleString('id-ID')} Suara
                </span>
              </div>

              <div className="rounded-xl border border-[#c9a64a]/40 bg-[#c9a64a]/20 px-4 py-2 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-[#e9c176] block">Persentase Kemenangan</span>
                <span className="font-mono text-lg sm:text-2xl font-black text-[#c9a64a]">
                  {winnerData.percent}%
                </span>
              </div>

              <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-2 backdrop-blur-md">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Status Hasil</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-400 flex items-center gap-1.5 mt-1">
                  ✓ Sah &amp; Ditetapkan
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada data perolehan suara yang masuk.
          </div>
        )}
      </main>

      {/* 4. BOTTOM FOOTER: Official Signatory Legal Badge */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-1 border-t border-white/10 pt-3 text-[11px] text-slate-400 sm:flex-row">
        <span>
          Badan Pengawas Pemilihan OSIS ({settings.org_name || 'BAWASLOS'}) · SMK Negeri 64 Jakarta
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          Ditetapkan secara resmi dan mengikat seluruh siswa. [F: Fullscreen]
        </span>
      </footer>
    </div>
  );
}
