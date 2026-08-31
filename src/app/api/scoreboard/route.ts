import { NextResponse } from 'next/server';
import { tally, voteTimeline, getScoreboardState } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// Endpoint publik read-only untuk scoreboard (dipolling oleh publik agar realtime
// saat admin mengubah publish/reveal). Tidak ada mutasi di sini.
export async function GET() {
  const state = getScoreboardState();
  if (!state.published) {
    return NextResponse.json({ published: false, revealed: 0, total: state.total });
  }
  const all = voteTimeline();
  const timeline = all.slice(0, state.revealed);
  const tallyData = tally().map((row) => ({
    ...row,
    votes: timeline.filter((t) => t.pair_id === row.pair_id).length,
  }));
  return NextResponse.json({
    published: true,
    revealed: timeline.length,
    total: state.total,
    timeline,
    tally: tallyData,
  });
}
