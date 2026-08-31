'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SealIcon } from '@/components/icons';

type TallyRow = {
  pair_id: number;
  number: number;
  chair_name: string;
  vice_name: string;
  photo_url: string;
  votes: number;
};

type TimelineRow = { voter_no: number; account_id: number; pair_id: number };

type Props = {
  initialTally: TallyRow[];
  timeline: TimelineRow[];
  total: number;
  revealedInit: number;
};

// Warna tiap paslon (navy / gold / navy-container) ala Civic Excellence.
const ACCENTS = ['#1B2E4B', '#C5A059', '#26415f'];

type ApiData = {
  published: boolean;
  revealed: number;
  total: number;
  timeline: TimelineRow[];
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

export default function ScoreboardClient({ initialTally, timeline, total, revealedInit }: Props) {
  const [api, setApi] = useState<ApiData | null>(null);

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

  const livePublished = api ? api.published : true;
  const liveTotal = api ? api.total : total;
  const liveTimeline = api ? api.timeline : timeline;
  const liveRevealed = api ? api.revealed : revealedInit;
  const liveTally = api
    ? api.tally
    : initialTally.map((row) => ({
        ...row,
        votes: timeline.filter((t) => t.pair_id === row.pair_id).length,
      }));

  const currentTally = useMemo(() => liveTally, [liveTally]);
  const totalVotes = liveTotal;
  const leader = currentTally.reduce(
    (a, b) => (b.votes > a.votes ? b : a),
    currentTally[0] || { votes: -1, chair_name: '', vice_name: '', number: 0 }
  );
  const isFinal = liveRevealed >= liveTotal && liveTotal > 0 && totalVotes > 0;

  if (!livePublished) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center font-sans">
        <h1 className="font-serif text-2xl font-bold text-[#1B2E4B]">Scoreboard</h1>
        <p className="mt-3 text-slate-600">
          Scoreboard sedang ditutup oleh pengawas. Silakan kembali saat hasil dibuka.
        </p>
        <div className="mt-6">
          <Link href="/" className="text-sm font-semibold text-[#1B2E4B] hover:text-[#C5A059]">← Beranda</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="arena-grid flex-grow flex flex-col items-center justify-center px-4 py-10 w-full max-w-[1280px] mx-auto font-sans relative lg:px-16">
      {/* Judul + Total Suara */}
      <div className="text-center mb-14 z-10 relative w-full">
        <p className="label-official mb-2">Rekapitulasi Suara · Pemilihan OSIS</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1B2E4B] tracking-tight">
          WHO WILL WIN?
        </h1>
        <div className="mt-6 inline-flex flex-col items-center bg-[#1B2E4B] p-6 rounded-2xl shadow-xl border border-[#C5A059]/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#C5A059]/10 blur-xl" />
          <span className="font-bold text-xs uppercase tracking-[0.2em] text-[#e9c176] relative z-10">Total Suara Masuk</span>
          <span className="font-serif text-5xl sm:text-6xl leading-none text-white font-bold arena-glow relative z-10 mt-1">
            <BigNum value={totalVotes} />
          </span>
          <span className="mt-2 text-xs text-white/60 relative z-10">
            {liveRevealed} dari {liveTotal} suara diumumkan
          </span>
        </div>
      </div>

      {/* Kartu Paslon */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-end relative">
        {currentTally.map((row, idx) => {
          const pct = (row.votes / totalVotes) * 100;
          const accent = ACCENTS[idx % ACCENTS.length];
          const revealed = liveRevealed > 0;
          return (
            <div
              key={row.pair_id}
              className="flex flex-col items-center w-full bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(3,25,53,0.08)] border border-[#e1e3e4] relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-2" style={{ background: accent }} />
              {/* Foto bulat */}
              <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-[#f8f9fa] shadow-inner mb-5 relative bg-[#1B2E4B]/5">
                {row.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="w-full h-full object-cover" src={row.photo_url} alt={`Paslon ${row.number}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#1B2E4B]/40 font-serif">
                    {row.chair_name?.[0] ?? '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-[#1B2E4B]/0 group-hover:bg-[#1B2E4B]/10 transition-colors" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#1B2E4B] text-center">Paslon {String(row.number).padStart(2, '0')}</h2>
              <p className="text-base text-[#44474d] text-center mb-6">
                {row.chair_name || '—'} &amp; {row.vice_name || '—'}
              </p>

              {/* Angka + Bar pillar */}
              <div className="flex items-end justify-between w-full h-[260px] gap-6">
                <div className="flex-grow flex flex-col justify-end items-end h-full">
                  <span className="font-serif text-2xl font-bold mb-1" style={{ color: accent }}>
                    {revealed ? `${Math.round(pct)}%` : '—'}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#44474d]">
                    {revealed ? `${row.votes.toLocaleString('id-ID')} Suara` : 'Belum diumumkan'}
                  </span>
                </div>
                <div className="w-20 h-full bg-[#edeeef] rounded-t-xl relative overflow-hidden border border-[#e1e3e4]">
                  <div
                    className="absolute bottom-0 left-0 w-full arena-pillar"
                    style={{ height: revealed ? `${pct}%` : '0%', background: accent, boxShadow: `0 0 15px ${accent}80` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isFinal && (
        <div className="mt-12 w-full max-w-2xl rounded-2xl border border-[#C5A059] bg-white p-8 text-center shadow-[0_8px_30px_rgb(3,25,53,0.08)]">
          <SealIcon className="mx-auto h-9 w-9 text-[#C5A059]" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-[#1B2E4B]">Hasil Akhir</h2>
          <p className="mt-2 text-[#44474d]">
            Total {liveTotal} suara sah. Paslon {String(leader.number).padStart(2, '0')} memimpin dengan {leader.votes.toLocaleString('id-ID')} suara.
          </p>
        </div>
      )}

    </main>
  );
}
