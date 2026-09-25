import Link from 'next/link';
import { getSettings } from '@/lib/queries';
import LogoSeal from '@/components/LogoSeal';
import SiteNav from '@/components/SiteNav';

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f3ec]">
      {/* Header konsisten (satu sumber: SiteNav) */}
      <SiteNav logoUrl={settings.logo_url} />

      <div className="flex-1">{children}</div>

      {/* Footer */}
      <footer className="border-t border-[#0b1f4b]/15 bg-[#fbfaf6]">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-[#2c3e63]">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <LogoSeal src={settings.logo_url} className="h-8 w-8" />
              <span className="font-serif text-lg font-bold text-[#0b1f4b]">BAWASLOS</span>
            </div>
            <span className="text-center">© 2024 Badan Pengawas Pemilihan OSIS. Jujur & Transparan.</span>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/panduan" className="font-medium hover:text-[#b0892f]">Panduan</Link>
              <Link href="/panduan" className="font-medium hover:text-[#b0892f]">Syarat</Link>
              <Link href="/panduan" className="font-medium hover:text-[#b0892f]">Kontak</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
