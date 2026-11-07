import {
  listPairs,
  getSettings,
  getScoreboardState,
  revealedTally,
  getDisplayState,
} from '@/lib/queries';
import PemenangClient from './pemenang-client';

export const dynamic = 'force-dynamic';

export default async function PemenangPage() {
  const pairs = await listPairs(true);
  const settings = await getSettings();
  const sbState = await getScoreboardState();
  const tally = await revealedTally(sbState.revealed);
  const display = await getDisplayState();

  return (
    <PemenangClient
      pairs={pairs}
      settings={settings}
      scoreboard={{
        published: sbState.published,
        revealed: sbState.revealed,
        total: sbState.total,
        tally,
      }}
      display={display}
    />
  );
}
