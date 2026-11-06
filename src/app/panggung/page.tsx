import {
  listPairs,
  getSettings,
  getDisplayState,
  getTimerState,
  getScoreboardState,
  revealedTally,
} from '@/lib/queries';
import PanggungClient from './panggung-client';

export const dynamic = 'force-dynamic';

export default async function PanggungPage() {
  const pairs = await listPairs(true);
  const settings = await getSettings();
  const display = await getDisplayState();
  const timer = await getTimerState();
  const sbState = await getScoreboardState();
  const tally = await revealedTally(sbState.revealed);

  return (
    <PanggungClient
      pairs={pairs}
      settings={settings}
      initialDisplay={display}
      initialTimer={timer}
      initialScoreboard={{
        published: sbState.published,
        revealed: sbState.revealed,
        total: sbState.total,
        tally,
      }}
    />
  );
}
