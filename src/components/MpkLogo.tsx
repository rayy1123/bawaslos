'use client';

type Props = {
  src?: string | null;
  className?: string;
  showText?: boolean;
  animated?: boolean;
};

export default function MpkLogo({
  src,
  className = 'h-24 w-24',
  showText = true,
  animated = true,
}: Props) {
  const imageSrc = src && src.trim() !== '' ? src : '/logo.png';

  return (
    <div className="flex flex-col items-center select-none">
      {/* Outer Glow & Animated Rotating Ring Container */}
      <div className="relative flex items-center justify-center">
        {/* 1. Pulsing Ambient Gold/Navy Glow Aura */}
        {animated && (
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#b0892f]/40 via-[#c9a64a]/25 to-[#0b1f4b]/30 blur-xl animate-pulse" />
        )}

        {/* 2. Rotating Outer Orbit Ring with Ticks */}
        {animated && (
          <div
            className="absolute -inset-2.5 rounded-full border-2 border-dashed border-[#b0892f]/50"
            style={{ animation: 'spinSlow 24s linear infinite' }}
          />
        )}

        {/* 3. Subtle Counter-rotating Concentric Ring */}
        {animated && (
          <div
            className="absolute -inset-1 rounded-full border border-dotted border-[#0b1f4b]/30"
            style={{ animation: 'spinSlow 18s linear infinite reverse' }}
          />
        )}

        {/* 4. Center Circular Seal Badge */}
        <div
          className={`relative z-10 flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 border-[#b0892f] bg-white shadow-lg ${className} ${
            animated ? 'transition-transform duration-500 hover:scale-105' : ''
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Logo MPK SMKN 64 Jakarta"
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.nextElementSibling;
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />

          {/* Fallback stylized MPK SVG Emblem if image fails to load */}
          <div className="hidden h-full w-full flex-col items-center justify-center bg-[#0b1f4b] p-2 text-center text-[#c9a64a]">
            <svg viewBox="0 0 100 100" className="h-4/5 w-4/5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="50" cy="50" r="45" stroke="#b0892f" strokeWidth="3" />
              <circle cx="50" cy="50" r="38" stroke="#c9a64a" strokeDasharray="3 3" />
              <path d="M50 15 v50 M30 30 h40 M25 50 l10-20 l10 20 z M55 50 l10-20 l10 20 z M35 75 h30 M50 65 v10" stroke="#c9a64a" strokeWidth="2.5" />
            </svg>
            <span className="text-[7px] font-black uppercase tracking-tighter">MPK 64</span>
          </div>
        </div>

        {/* 5. Floating Badge Accent */}
        {animated && (
          <div className="absolute -top-1.5 z-20 flex items-center justify-center rounded-full bg-[#0b1f4b] px-2 py-0.5 text-[9px] font-extrabold text-[#c9a64a] shadow-sm border border-[#b0892f]/50">
            ★ MPK ★
          </div>
        )}
      </div>

      {/* Typography Description Badge */}
      {showText && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#b0892f]/30 bg-[#fbf6ea] px-3 py-0.5 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b0892f] animate-ping" />
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-[#0b1f4b]">
              MPK SMKN 64 JAKARTA
            </span>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            Majelis Perwakilan Kelas · Pengawas Pemilihan
          </p>
        </div>
      )}
    </div>
  );
}
