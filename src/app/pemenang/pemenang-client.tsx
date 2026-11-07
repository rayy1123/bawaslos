'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { Pair, Settings, DisplayState } from '@/lib/queries';
import MpkLogo from '@/components/MpkLogo';
import LogoSeal from '@/components/LogoSeal';

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

// 18 decorative confetti pieces
const CONFETTI_PIECES = [
  { left: '5%', delay: '0s', duration: '5.2s', color: '#ffd700', size: '12px' },
  { left: '12%', delay: '1.4s', duration: '6.1s', color: '#ff4d4d', size: '10px' },
  { left: '22%', delay: '0.6s', duration: '4.8s', color: '#38bdf8', size: '14px' },
  { left: '32%', delay: '2.1s', duration: '5.5s', color: '#c9a64a', size: '11px' },
  { left: '42%', delay: '0.2s', duration: '6.4s', color: '#10b981', size: '13px' },
  { left: '50%', delay: '1.8s', duration: '5.0s', color: '#fbbf24', size: '15px' },
  { left: '58%', delay: '0.9s', duration: '5.8s', color: '#f43f5e', size: '10px' },
  { left: '68%', delay: '2.4s', duration: '4.9s', color: '#38bdf8', size: '12px' },
  { left: '78%', delay: '0.4s', duration: '6.2s', color: '#ffd700', size: '14px' },
  { left: '88%', delay: '1.6s', duration: '5.3s', color: '#10b981', size: '11px' },
  { left: '95%', delay: '0.8s', duration: '5.7s', color: '#c9a64a', size: '13px' },
];

export default function PemenangClient({
  pairs,
  settings,
  scoreboard,
  display,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveTally, setLiveTally] = useState(scoreboard.tally);
  const [liveTotal, setLiveTotal] = useState(scoreboard.total);
  const [displayState, setDisplayState] = useState<DisplayState>(display || {
    mode: 'winner',
    video_sound: false,
    winner_target: 'auto',
    updated_at: '',
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Poll for scoreboard & display updates
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [resSb, resDisp] = await Promise.all([
          fetch('/api/scoreboard', { cache: 'no-store' }),
          fetch('/api/display', { cache: 'no-store' }),
        ]);

        if (resSb.ok && alive) {
          const dataSb = await resSb.json();
          if (dataSb.tally) {
            setLiveTally(dataSb.tally);
            setLiveTotal(dataSb.total || 0);
          }
        }

        if (resDisp.ok && alive) {
          const dataDisp = await resDisp.json();
          setDisplayState(dataDisp);
        }
      } catch {
        // Ignore network hiccups
      }
    };

    const interval = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Determine which candidate is highlighted
  const winnerData = useMemo(() => {
    const target = displayState?.winner_target;
    let selectedPair: any = null;

    if (target === '1') {
      selectedPair = pairs.find((p) => p.number === 1) || pairs[0];
    } else if (target === '2') {
      selectedPair = pairs.find((p) => p.number === 2) || pairs[1] || pairs[0];
    }

    const sorted = [...liveTally].sort((a, b) => b.votes - a.votes);
    const top = sorted[0];

    if (!selectedPair) {
      if (top) {
        selectedPair = pairs.find((p) => p.number === top.number) || top;
      } else {
        selectedPair = pairs[0];
      }
    }

    const voteEntry = liveTally.find((t) => t.number === selectedPair?.number);
    const votes = voteEntry?.votes ?? 0;
    const totalVotesCount = liveTotal || 1;
    const percent = Math.round((votes / totalVotesCount) * 100);

    return {
      pair: selectedPair,
      votes,
      percent,
    };
  }, [liveTally, pairs, liveTotal, displayState?.winner_target]);

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
      className="relative min-h-screen h-screen max-h-screen w-screen overflow-hidden bg-gradient-to-b from-[#030914] via-[#06142c] to-[#02050b] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-7 select-none"
    >
      {/* 1. VISUAL SPECTACLE: Rotating Golden Light Rays Background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-25">
        <div
          className="h-[120vw] w-[120vw] rounded-full animate-rays"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(201, 166, 74, 0.25) 20deg, transparent 40deg, rgba(255, 215, 0, 0.3) 60deg, transparent 80deg, rgba(201, 166, 74, 0.25) 100deg, transparent 120deg, rgba(255, 215, 0, 0.3) 140deg, transparent 160deg, rgba(201, 166, 74, 0.25) 180deg, transparent 200deg, rgba(255, 215, 0, 0.3) 220deg, transparent 240deg, rgba(201, 166, 74, 0.25) 260deg, transparent 280deg, rgba(255, 215, 0, 0.3) 300deg, transparent 320deg, rgba(201, 166, 74, 0.25) 340deg, transparent 360deg)',
          }}
        />
      </div>

      {/* Ambient Gold Radial Halo */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#ffd700]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#0b1f4b]/50 blur-3xl" />

      {/* Falling Celebratory Confetti Stream */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI_PIECES.map((c, i) => (
          <div
            key={i}
            className="absolute rounded-sm opacity-90 shadow-sm"
            style={{
              left: c.left,
              top: '-10px',
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              animation: `confettiFall ${c.duration} linear infinite`,
              animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      {/* 2. TOP HEADER: Official MPK & Bawaslos Seals */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <MpkLogo
            src={settings.logo_url}
            className="h-13 w-13 sm:h-16 sm:w-16"
            showText={false}
            animated={true}
          />
          <div>
            <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#ffd700]">
              MPK SMKN 64 JAKARTA · BAWASLOS
            </span>
            <h1 className="font-serif text-sm sm:text-lg font-bold tracking-tight text-white drop-shadow-sm">
              Sidang Pleno Penetapan Ketua &amp; Wakil Ketua OSIS Terpilih
            </h1>
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

      {/* 3. CENTER: SPECTACULAR WINNER SPOTLIGHT PODIUM */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto w-full">
        {/* Championship Header Ribbon */}
        <div className="flex flex-col items-center mb-3 animate-fade-up">
          {/* Trophy & Golden Laurels */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl sm:text-2xl text-[#ffd700]">🌿</span>
            <span className="text-4xl sm:text-5xl lg:text-6xl drop-shadow-[0_0_35px_rgba(255,215,0,0.7)] animate-bounce">
              🏆
            </span>
            <span className="text-xl sm:text-2xl text-[#ffd700]">🌿</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd700]/60 bg-gradient-to-r from-[#0b1f4b] via-[#163574] to-[#0b1f4b] px-5 sm:px-8 py-1.5 shadow-xl backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#ffd700] animate-ping" />
            <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-[#ffd700] uppercase">
              ★ PASANGAN CALON TERPILIH PERIODE 2026/2027 ★
            </span>
            <span className="h-2 w-2 rounded-full bg-[#ffd700] animate-ping" />
          </div>

          <h2 className="mt-2.5 font-serif text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-lg">
            SELAMAT ATAS TERPILIHNYA
          </h2>
        </div>

        {/* Winner Hero Card */}
        {winner && (
          <div className="group relative flex flex-col items-center animate-fade-up">
            {/* Square Frame Photo of Winner with Multi-Layer Golden Glow */}
            <div className="relative mb-3.5">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-[#b0892f] via-[#ffd700] to-[#e9c176] opacity-80 blur-xl animate-pulse" />
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 lg:h-60 lg:w-60 overflow-hidden rounded-2xl border-4 border-[#ffd700] bg-slate-900 shadow-2xl">
                {winner.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winner.photo_url}
                    alt={`Paslon ${winner.number}`}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-5xl font-black text-[#ffd700]">
                    {winner.number}
                  </div>
                )}
                {/* Number Badge */}
                <div className="absolute top-2.5 left-2.5 rounded-lg bg-[#0b1f4b] px-3 py-1 text-xs sm:text-sm font-mono font-black text-[#ffd700] shadow-md border border-[#ffd700]/50">
                  NO. {String(winner.number).padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Candidate Names in Magnificent Plus Jakarta Sans Typography */}
            <h3 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
              {winner.chair_name} &amp; {winner.vice_name}
            </h3>
            <p className="mt-0.5 font-serif text-xs sm:text-base font-bold text-[#ffd700] tracking-wide">
              Ketua &amp; Wakil Ketua OSIS Terpilih · SMK Negeri 64 Jakarta
            </p>

            {/* Victory Statistics Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3.5">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Perolehan Suara</span>
                <span className="font-mono text-base sm:text-xl font-black text-white">
                  {winnerData.votes.toLocaleString('id-ID')} Suara
                </span>
              </div>

              <div className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/20 px-4 py-2 backdrop-blur-md shadow-sm">
                <span className="text-[10px] uppercase font-bold text-[#ffd700] block">Persentase</span>
                <span className="font-mono text-base sm:text-xl font-black text-[#ffd700]">
                  {winnerData.percent}%
                </span>
              </div>

              <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-4 py-2 backdrop-blur-md shadow-sm">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Hasil Pemilihan</span>
                <span className="font-mono text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  ✓ Sah &amp; Ditetapkan
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. BOTTOM FOOTER: Official Signatory Legal Badge */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-1 border-t border-white/10 pt-2.5 text-[11px] text-slate-400 sm:flex-row">
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
