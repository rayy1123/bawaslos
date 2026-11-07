import { revealedTally, getScoreboardState, getSettings } from '@/lib/queries';
import Link from 'next/link';
import ScoreboardClient from './scoreboard-client';

export const dynamic = 'force-dynamic';

export default async function PublicScoreboardPage() {
  const state = await getScoreboardState();
  const settings = await getSettings();
  const total = state.total;

  // Publik hanya boleh melihat bila admin mem-publish.
  if (!state.published) {
    return (
      <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-lg space-y-4">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b1f4b]/10 text-2xl text-[#0b1f4b]">
              🔒
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#0b1f4b]">Scoreboard Ditutup</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Scoreboard pemilihan sedang ditutup oleh pengawas. Silakan kembali lagi saat sesi pengumuman hasil dibuka.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b1f4b] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#142c63]"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Hanya suara yang sudah di-reveal oleh admin yang dihitung untuk tampilan publik.
  const tallyData = await revealedTally(state.revealed);

  return (
    <ScoreboardClient
      initialTally={tallyData}
      total={total}
      revealedInit={state.revealed}
      settings={settings}
    />
  );
}
