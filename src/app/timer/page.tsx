import { listPairs, getSettings, getTimerState } from '@/lib/queries';
import AppShell from '@/components/AppShell';
import TimerClient from './timer-client';

export const dynamic = 'force-dynamic';

export default async function TimerPage() {
  const pairs = await listPairs(true);
  const settings = await getSettings();
  const timer = await getTimerState();

  return (
    <AppShell>
      <TimerClient pairs={pairs} settings={settings} initialTimer={timer} />
    </AppShell>
  );
}
