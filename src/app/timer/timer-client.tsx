'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Pair, Settings, TimerState } from '@/lib/queries';
import MpkLogo from '@/components/MpkLogo';

type Props = {
  pairs: Pair[];
  settings: Settings;
  initialTimer: TimerState;
};

export default function TimerClient({ pairs, settings, initialTimer }: Props) {
  const [timerState, setTimerState] = useState<TimerState>(initialTimer);
  const [timeLeft, setTimeLeft] = useState<number>(initialTimer.remaining);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const containerRef = useRef<HTMLDivElement>(null);
  const prevTimeRef = useRef<number>(initialTimer.remaining);

  // Web Audio Synthesizer Beep (100% browser native, zero audio file dependencies)
  function playBeep(freq = 880, duration = 0.15, type: OscillatorType = 'sine') {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }

  // Play finish celebratory/alarm sequence
  function playFinishChime() {
    if (!soundEnabled) return;
    try {
      playBeep(587.33, 0.15, 'triangle');
      setTimeout(() => playBeep(739.99, 0.15, 'triangle'), 150);
      setTimeout(() => playBeep(880, 0.5, 'triangle'), 300);
    } catch {
      // Ignore
    }
  }

  // 1. Polling API `/api/timer` every 1000ms to synchronize with Admin Dashboard
  useEffect(() => {
    let isSubscribed = true;

    async function pollTimer() {
      try {
        const res = await fetch('/api/timer', { cache: 'no-store' });
        if (res.ok && isSubscribed) {
          const data: TimerState = await res.json();
          setTimerState(data);

          if (data.is_running && data.target_end > 0) {
            const calculated = Math.max(0, Math.round((data.target_end - Date.now()) / 1000));
            setTimeLeft(calculated);
          } else {
            setTimeLeft(data.remaining);
          }
        }
      } catch {
        // Fallback gracefully on network hiccup
      }
    }

    const pollInterval = setInterval(pollTimer, 1000);
    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, []);

  // 2. High-precision local countdown loop (ticks every 250ms for smooth drift-free seconds)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      if (timerState.is_running && timerState.target_end > 0) {
        const now = Date.now();
        const currentRemaining = Math.max(0, Math.round((timerState.target_end - now) / 1000));

        // Sound triggers
        if (prevTimeRef.current !== currentRemaining) {
          if (currentRemaining === 30) {
            playBeep(660, 0.3, 'sine');
          } else if (currentRemaining <= 5 && currentRemaining > 0) {
            playBeep(880, 0.1, 'sine');
          } else if (currentRemaining === 0 && prevTimeRef.current > 0) {
            playFinishChime();
          }
          prevTimeRef.current = currentRemaining;
        }

        setTimeLeft(currentRemaining);
      } else {
        setTimeLeft(timerState.remaining);
        prevTimeRef.current = timerState.remaining;
      }
    }, 250);

    return () => clearInterval(tickInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.is_running, timerState.target_end, timerState.remaining, soundEnabled]);

  // Fullscreen change listener
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Keyboard shortcut listener (F for fullscreen)
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

  // Formatting MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage (100 -> 0)
  const duration = timerState.duration || 120;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (timeLeft / duration) * 100)) : 0;

  // Warning thresholds
  const isFinished = timeLeft === 0;
  const isCritical = timeLeft > 0 && timeLeft <= 10;
  const isWarning = timeLeft > 10 && timeLeft <= 30;

  // Theme-aware styles
  const isDark = themeMode === 'dark' || isFullscreen;

  const timeColorClass = isFinished
    ? 'text-red-500 animate-timer-pulse'
    : isCritical
    ? 'text-red-500 animate-timer-pulse'
    : isWarning
    ? 'text-amber-400'
    : isDark
    ? 'text-[#f6f3ec]'
    : 'text-[#0b1f4b]';

  const progressBgClass = isFinished || isCritical
    ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
    : isWarning
    ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
    : 'bg-[#c9a64a] shadow-[0_0_12px_rgba(201,166,74,0.5)]';

  // Active speaker details
  const activeSpeakerKey = timerState.speaker;
  const activePair = pairs.find((p) => `paslon-${p.number}` === activeSpeakerKey);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen select-none transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-b from-[#050e1f] via-[#07142d] to-[#040915] text-white'
          : 'bg-[#f7f6f1] text-slate-800'
      } flex flex-col justify-between p-4 sm:p-8`}
    >
      {/* 1. TOP HEADER: Animated MPK Logo + Synchronized Title */}
      <header className="flex flex-col items-center justify-between gap-4 border-b pb-4 sm:flex-row sm:pb-6 border-white/10">
        {/* Animated MPK Seal Logo */}
        <div className="flex items-center gap-4">
          <MpkLogo
            src={settings.logo_url}
            className="h-16 w-16 sm:h-20 sm:w-20"
            showText={false}
            animated={true}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#b0892f]/20 px-3 py-0.5 font-mono text-[10px] sm:text-xs font-black tracking-widest text-[#c9a64a] uppercase border border-[#b0892f]/40">
                MPK SMKN 64 JAKARTA
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Terhubung
              </span>
            </div>
            <h1 className="mt-1 font-serif text-lg sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              {timerState.title || 'Sesi Debat & Tanya Jawab'}
            </h1>
          </div>
        </div>

        {/* Top Control Tools (Sound, Fullscreen, Dark/Light, Home) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playBeep(880, 0.1);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
              soundEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title="Aktifkan / Matikan Bunyi Bel"
          >
            {soundEnabled ? '🔔 Bel Aktif' : '🔕 Bisu'}
          </button>

          {/* Theme Toggle */}
          {!isFullscreen && (
            <button
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
            >
              {themeMode === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Panggung'}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="rounded-xl bg-[#c9a64a] px-3.5 py-1.5 text-xs font-black text-[#0b1f4b] shadow-md hover:bg-[#d8b55c]"
            title="Layar Penuh (F)"
          >
            {isFullscreen ? '↙ Keluar Layar Penuh' : '⛶ Layar Panggung Proyektor'}
          </button>

          {!isFullscreen && (
            <Link
              href="/"
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              Beranda
            </Link>
          )}
        </div>
      </header>

      {/* 2. CENTER: THE SINGLE MASSIVE DISPLAY (SATU TIMER BESAR) */}
      <main className="my-auto flex flex-col items-center justify-center py-6 sm:py-10 text-center">
        {/* Dynamic Speaker Badge (Dikendalikan Admin) */}
        <div className="mb-4 sm:mb-6 animate-fade-up">
          {activePair ? (
            <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-[#b0892f] bg-[#0b1f4b]/90 px-6 py-2.5 shadow-xl backdrop-blur-md">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c9a64a] font-mono text-sm font-black text-[#0b1f4b]">
                {activePair.number}
              </span>
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#c9a64a]">
                  GILIRAN BICARA:
                </span>
                <p className="font-serif text-base sm:text-xl font-extrabold text-white">
                  Paslon {activePair.number}: {activePair.chair_name} &amp; {activePair.vice_name}
                </p>
              </div>
            </div>
          ) : activeSpeakerKey === 'mod' ? (
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-blue-400/30 bg-blue-950/80 px-6 py-2 shadow-lg backdrop-blur-md">
              <span className="text-xl">🎙️</span>
              <span className="font-serif text-sm sm:text-lg font-bold text-blue-200">
                Giliran: Moderator / Panelis Penguji
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold text-slate-300">
              <span>⚖️ Sesi Bersama / Debat Bebas</span>
            </div>
          )}
        </div>

        {/* GIANT COUNTDOWN DIGITS (MM:SS) */}
        <div className="relative w-full max-w-5xl">
          <div
            className={`font-mono font-black tracking-tight leading-none drop-shadow-2xl ${timeColorClass}`}
            style={{ fontSize: 'clamp(5.5rem, 24vw, 22rem)' }}
          >
            {formattedTime}
          </div>

          {/* Time's Up Banner */}
          <div className="mt-4 sm:mt-6 h-10 flex items-center justify-center">
            {isFinished ? (
              <span className="rounded-full bg-red-600 px-6 py-2 text-base sm:text-2xl font-black uppercase tracking-widest text-white shadow-2xl animate-bounce">
                ⚠️ WAKTU TELAH HABIS! ⚠️
              </span>
            ) : isCritical ? (
              <span className="rounded-full bg-red-600/30 border border-red-500/50 px-5 py-1.5 text-xs sm:text-base font-bold text-red-300 animate-pulse">
                ● Sisa {timeLeft} Detik Terakhir
              </span>
            ) : isWarning ? (
              <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-5 py-1.5 text-xs sm:text-base font-bold text-amber-300">
                ● Peringatan: Waktu Kurang Dari 30 Detik
              </span>
            ) : !timerState.is_running && timeLeft === duration ? (
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                Menunggu instruksi dari Dashboard Admin…
              </span>
            ) : !timerState.is_running ? (
              <span className="rounded-full bg-white/10 px-4 py-1 text-xs sm:text-sm font-bold text-slate-300">
                ⏸ Waktu Sedang Dijeda
              </span>
            ) : null}
          </div>
        </div>

        {/* Horizontal Progress Meter Bar */}
        <div className="mx-auto mt-6 w-full max-w-3xl px-4">
          <div className="h-3 sm:h-4 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-linear ${progressBgClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER & SYNC STATUS */}
      <footer className="flex flex-col items-center justify-between gap-2 border-t pt-4 text-xs border-white/10 sm:flex-row text-slate-400">
        <div className="flex items-center gap-2">
          <span>Badan Pengawas Pemilihan OSIS · MPK SMK Negeri 64 Jakarta</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Dapat diatur langsung dari <Link href="/admin" className="underline hover:text-white font-bold">Dashboard Admin</Link>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-slate-500">
            [F: Fullscreen]
          </span>
        </div>
      </footer>
    </div>
  );
}
