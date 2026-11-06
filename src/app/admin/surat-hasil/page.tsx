import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import {
  getSettings,
  getScoreboardState,
  listPairs,
  getVotersStats,
  getMilestoneTally,
} from '@/lib/queries';
import SuratClient from './surat-client';

export const dynamic = 'force-dynamic';

export default async function SuratHasilPage({
  searchParams,
}: {
  searchParams: { step?: string; limit?: string };
}) {
  if (!(await isAdmin())) redirect('/admin/login');

  const settings = await getSettings();
  const sbState = await getScoreboardState();
  const pairs = await listPairs(true);
  const votersStats = await getVotersStats();

  const stepInterval = Number(searchParams.step) || 10;
  const revealLimit = searchParams.limit ? Number(searchParams.limit) : sbState.revealed;

  const milestoneData = await getMilestoneTally(revealLimit, stepInterval);

  return (
    <SuratClient
      settings={settings}
      scoreboard={sbState}
      pairs={pairs}
      votersStats={votersStats}
      milestoneData={milestoneData}
      currentStepInterval={stepInterval}
      currentLimit={revealLimit}
    />
  );
}
