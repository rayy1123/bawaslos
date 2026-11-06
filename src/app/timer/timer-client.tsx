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

  const containerRef = useRef<HTMLDivElement>(null);
  const prevTimeRef = useRef<number>(initialTimer.remaining);

  // Web Audio Synthesizer Beep (100% native, zero dependencies)
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
      // Audio context might be restricted before user gesture
    }
  }

  // Play celebratory/alert finish chime
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

  // Keyboard shortcut listener (F: Fullscreen, M: Mute/Unmute)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setSoundEnabled((prev) => !prev);
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

  const timeColorClass = isFinished
    ? 'text-red-500 animate-timer-pulse'
    : isCritical
    ? 'text-red-500 animate-timer-pulse'
    : isWarning
    ? 'text-amber-400'
    : 'text-[#f6f3ec]';

  const progressBgClass = isFinished || isCritical
    ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
    : isWarning
    ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
    : 'bg-[#c9a64a] shadow-[0_0_12px_rgba(201,166,74,0.5)]';

  // Active speaker details (only shown if a specific candidate / moderator is selected)
  const activeSpeakerKey = timerState.speaker;
  const activePair = pairs.find((p) => `paslon-${p.number}` === activeSpeakerKey);

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="min-h-screen select-none bg-gradient-to-b from-[#050e1f] via-[#07142d] to-[#040915] text-white flex flex-col justify-between p-4 sm:p-8 transition-colors duration-500"
    >
      {/* 1. TOP HEADER: Animated MPK Logo + Clean Session Title */}
      <header className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4 sm:gap-5">
          <MpkLogo
            src={settings.logo_url}
            className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24"
            showText={false}
            animated={true}
          />
          <div>
            <span className="font-mono text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-[#c9a64a]">
              MPK SMKN 64 JAKARTA
            </span>
            <h1 className="font-serif text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              {timerState.title || 'Sesi Debat & Tanya Jawab'}
            </h1>
          </div>
        </div>

        {/* Subtle, Unobtrusive Controls (Ghost on hover only - keeping screen distraction-free) */}
        <div className="flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playBeep(880, 0.1);
            }}
            className="rounded-lg p-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10"
            title={soundEnabled ? 'Matikan Suara Bel' : 'Nyalakan Suara Bel'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10"
            title="Layar Penuh (F)"
          >
            ⛶
          </button>

          <Link
            href="/"
            className="rounded-lg p-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10"
            title="Kembali ke Beranda"
          >
            ⌂
          </Link>
        </div>
      </header>

      {/* 2. CENTER: THE CLEAN GIANT TIMER (MENIT : DETIK) */}
      <main className="my-auto flex flex-col items-center justify-center py-4 text-center">
        {/* Optional Speaker Indicator (Only appears if a specific Paslon or Moderator is active) */}
        <div className="min-h-12 flex items-center justify-center">
          {activePair ? (
            <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-[#b0892f] bg-[#0b1f4b]/90 px-6 py-2 shadow-xl backdrop-blur-md animate-fade-up">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#c9a64a] font-mono text-xs font-black text-[#0b1f4b]">
                {activePair.number}
              </span>
              <p className="font-serif text-sm sm:text-lg font-extrabold text-white">
                Paslon {activePair.number}: {activePair.chair_name} &amp; {activePair.vice_name}
              </p>
            </div>
          ) : activeSpeakerKey === 'mod' ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-950/80 px-5 py-1.5 shadow-lg backdrop-blur-md animate-fade-up">
              <span className="text-base">🎙️</span>
              <span className="font-serif text-xs sm:text-base font-bold text-blue-200">
                Moderator / Panelis
              </span>
            </div>
          ) : null}
        </div>

        {/* GIANT COUNTDOWN DIGITS (MM:SS) */}
        <div className="w-full max-w-5xl my-2">
          <div
            className={`font-mono font-black tracking-tight leading-none drop-shadow-2xl select-none ${timeColorClass}`}
            style={{ fontSize: 'clamp(6rem, 27vw, 25rem)' }}
          >
            {formattedTime}
          </div>

          {/* Time Expired Indicator */}
          <div className="h-10 mt-2 flex items-center justify-center">
            {isFinished && (
              <span className="rounded-full bg-red-600 px-6 py-2 text-base sm:text-2xl font-black uppercase tracking-widest text-white shadow-2xl animate-bounce">
                ⚠️ WAKTU TELAH HABIS! ⚠️
              </span>
            )}
          </div>
        </div>

        {/* Minimal Progress Bar Under Timer */}
        <div className="w-full max-w-2xl px-6">
          <div className="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-linear ${progressBgClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </main>

      {/* 3. BOTTOM: COMPLETELY CLEAN */}
      <footer className="h-4" />
    </div>
  );
}
