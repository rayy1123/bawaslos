import { revealedTally, getScoreboardState } from '@/lib/queries';
import Link from 'next/link';
import ScoreboardClient from './scoreboard-client';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function PublicScoreboardPage() {
  const state = getScoreboardState();
  const total = state.total;
  // Publik hanya boleh melihat bila admin mem-publish.
  if (!state.published) {
    return (
      <AppShell>
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-extrabold text-[#0b1f4b]">Scoreboard</h1>
          <p className="mt-3 text-slate-600">
            Scoreboard sedang ditutup oleh pengawas. Silakan kembali saat hasil dibuka.
          </p>
          <div className="mt-6">
            <Link href="/" className="text-sm font-semibold text-[#0b1f4b] underline">
              ← Beranda
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }
  // Hanya suara yang sudah di-reveal oleh admin yang dihitung untuk tampilan publik.
  const tallyData = revealedTally(state.revealed);
  return (
    <AppShell>
      <ScoreboardClient
        initialTally={tallyData}
        total={total}
        revealedInit={state.revealed}
      />
    </AppShell>
  );
}
