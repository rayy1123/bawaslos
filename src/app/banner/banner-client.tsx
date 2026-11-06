'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Settings } from '@/lib/queries';

type Props = {
  settings: Settings;
};

export default function BannerClient({ settings }: Props) {
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure video plays smoothly on mount
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: muted play always works
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    }
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
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
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

  return (
    <div
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black select-none"
    >
      {/* 1. SEAMLESS LOOPING BANNER VIDEO (NO PLAYER CONTROLS) */}
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

      {/* 2. SUBTLE GHOST CONTROLS (Top Right, fades in on hover) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2.5 opacity-25 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={toggleSound}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur-md hover:bg-black/80 shadow-md"
          title={isMuted ? 'Nyalakan Audio Video (M)' : 'Matikan Audio Video (M)'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

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

      {/* 3. Subtle corner badge watermark */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none opacity-40">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/80 drop-shadow-md">
          {settings.org_name || 'BAWASLOS'} · SMKN 64 JAKARTA
        </span>
      </div>
    </div>
  );
}
