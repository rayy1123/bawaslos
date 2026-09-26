import { redirect } from 'next/navigation';
import { currentVoterAccount } from '@/lib/session';
import { getSettings } from '@/lib/queries';
import VoterLoginCard from './voter-login-card';

export const dynamic = 'force-dynamic';

export default async function VoterLoginPage() {
  // Kalau sudah login, langsung ke bilik suara.
  if ((await currentVoterAccount()) != null) redirect('/vote');
  const settings = await getSettings();
  return (
    <VoterLoginCard
      logoUrl={settings.logo_url}
      mascotUrl={settings.mascot_url}
      orgName={settings.org_name}
    />
  );
}
