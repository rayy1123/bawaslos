'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Pair, Settings, DisplayState, DisplayMode, TimerState } from '@/lib/queries';
import TimerClient from '@/app/timer/timer-client';
import ScoreboardClient from '@/app/scoreboard/scoreboard-client';

type Props = {
  pairs: Pair[];
  settings: Settings;
  initialDisplay: DisplayState;
  initialTimer: TimerState;
  initialScoreboard: {
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
};

export default function PanggungClient({
  pairs,
  settings,
  initialDisplay,
  initialTimer,
  initialScoreboard,
}: Props) {
  const [displayState, setDisplayState] = useState<DisplayState>(initialDisplay);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(!initialDisplay.video_sound);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Polling sync `/api/display` every 1000ms for instant remote switching from Admin Dashboard
  useEffect(() => {
    let isSubscribed = true;

    async function pollDisplay() {
      try {
        const res = await fetch('/api/display', { cache: 'no-store' });
        if (res.ok && isSubscribed) {
          const data: DisplayState = await res.json();
          setDisplayState((prev) => {
            if (prev.mode !== data.mode || prev.video_sound !== data.video_sound) {
              return data;
            }
            return prev;
          });
        }
      } catch {
        // Ignore network hiccups gracefully
      }
    }

    const interval = setInterval(pollDisplay, 1000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Play video when switching to banner mode
  useEffect(() => {
    if (displayState.mode === 'banner' && videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    }
  }, [displayState.mode]);

  // Fullscreen event listener
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Keyboard shortcut listener (F: Fullscreen, M: Mute/Unmute, 1/2/3: Manual local switch)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
      } else if (e.code === 'Digit1') {
        setDisplayState((prev) => ({ ...prev, mode: 'banner' }));
      } else if (e.code === 'Digit2') {
        setDisplayState((prev) => ({ ...prev, mode: 'scoreboard' }));
      } else if (e.code === 'Digit3') {
        setDisplayState((prev) => ({ ...prev, mode: 'timer' }));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

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

  function toggleSound() {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  }

  const mode = displayState.mode;

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="relative h-screen w-screen overflow-hidden bg-black select-none"
    >
      {/* GHOST CONTROLS OVERLAY (Hover top right only) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity duration-300">
        {mode === 'banner' && (
          <button
            onClick={toggleSound}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur-md hover:bg-black/80 shadow-md"
            title={isMuted ? 'Nyalakan Audio Video (M)' : 'Matikan Audio Video (M)'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur-md hover:bg-black/80 shadow-md"
          title="Layar Penuh (F)"
        >
          ⛶
        </button>

        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur-md hover:bg-black/80 shadow-md"
          title="Buka Dashboard Admin"
        >
          ⚙️
        </Link>
      </div>

      {/* VIEW 1: VIDEO BANNER (Auto-repeater, No control bar, Fullscreen) */}
      {mode === 'banner' && (
        <div className="relative h-full w-full flex items-center justify-center bg-black animate-fade-in">
          <video
            ref={videoRef}
            src="/banner.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            controls={false}
            disablePictureInPicture
            className="h-full w-full object-contain md:object-cover"
          />

          {/* Discreet corner badge */}
          <div className="absolute bottom-3 left-4 z-20 pointer-events-none opacity-40">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/80 drop-shadow-md">
              {settings.org_name || 'BAWASLOS'} · SMKN 64 JAKARTA
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE SCOREBOARD ARENA */}
      {mode === 'scoreboard' && (
        <div className="h-full w-full overflow-y-auto bg-[#f8f9fa] animate-fade-in">
          <div className="py-6 sm:py-10">
            <ScoreboardClient
              initialTally={initialScoreboard.tally}
              total={initialScoreboard.total}
              revealedInit={initialScoreboard.revealed}
            />
          </div>
        </div>
      )}

      {/* VIEW 3: GIANT STAGE TIMER (DEBAT & Q&A) */}
      {mode === 'timer' && (
        <div className="h-full w-full animate-fade-in">
          <TimerClient
            pairs={pairs}
            settings={settings}
            initialTimer={initialTimer}
          />
        </div>
      )}
    </div>
  );
}
