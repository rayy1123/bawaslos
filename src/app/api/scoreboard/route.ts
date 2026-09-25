import { NextResponse } from 'next/server';
import { revealedTally, getScoreboardState } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// Endpoint publik read-only untuk scoreboard (dipolling oleh publik agar realtime
// saat admin mengubah publish/reveal).
// Data pilihan individual pemilih tidak diekspos ke publik demi menjaga kerahasiaan suara (LUBER).
export async function GET() {
  const state = await getScoreboardState();
  if (!state.published) {
    return NextResponse.json({ published: false, revealed: 0, total: state.total, tally: [] });
  }
  const tallyData = await revealedTally(state.revealed);
  return NextResponse.json({
    published: true,
    revealed: state.revealed,
    total: state.total,
    tally: tallyData,
  });
}
