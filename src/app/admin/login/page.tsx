import { isAdmin } from '@/lib/session';
import { getSettings } from '@/lib/queries';
import { redirect } from 'next/navigation';
import AdminLoginClient from './admin-login-client';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');
  const settings = getSettings();
  return <AdminLoginClient logoUrl={settings.logo_url} />;
}
