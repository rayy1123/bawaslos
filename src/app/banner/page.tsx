import { getSettings } from '@/lib/queries';
import BannerClient from './banner-client';

export const dynamic = 'force-dynamic';

export default async function BannerPage() {
  const settings = await getSettings();
  return <BannerClient settings={settings} />;
}
