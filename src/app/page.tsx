import { listPairs, getSettings } from '@/lib/queries';
import { isAdmin } from '@/lib/session';
import HomeClient from './home-client';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const pairs = listPairs(true);
  const admin = await isAdmin();
  const settings = getSettings();
  return (
    <AppShell>
      <HomeClient pairs={pairs} isAdmin={admin} settings={settings} />
    </AppShell>
  );
}