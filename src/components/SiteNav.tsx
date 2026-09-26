'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoSeal from '@/components/LogoSeal';

const NAV = [
  { href: '/', label: 'Kandidat' },
  { href: '/berita', label: 'Berita' },
  { href: '/panduan', label: 'Panduan' },
  { href: '/vote', label: 'Voting' },
  { href: '/scoreboard', label: 'Scoreboard' },
];

type Props = { logoUrl?: string | null; orgName?: string | null };

export default function SiteNav({ logoUrl, orgName }: Props) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#0b1f4b]/10 bg-[#f6f3ec]/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex h-12 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Beranda Bawaslos"
          >
            <LogoSeal src={logoUrl} className={`h-9 w-9 ${isHome ? 'seal-rise' : ''}`} />
            <span className={`text-lg font-bold text-[#0b1f4b] ${isHome ? 'brand-slide' : ''}`}>
              {orgName || 'BAWASLOS'}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" role="navigation" aria-label="Navigasi utama">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#b0892f] ${
                  isActive(l.href)
                    ? 'bg-[#b0892f] text-white'
                    : 'text-[#0b1f4b] hover:bg-[#b0892f]/10 hover:text-[#b0892f]'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/admin/login"
            className="rounded-md bg-[#b0892f] px-4 py-2 text-sm font-semibold text-[#0b1f4b] hover:bg-[#9c7826] focus:outline-none focus:ring-2 focus:ring-[#b0892f]"
          >
            Portal Admin
          </Link>
        </div>
      </div>
    </header>
  );
}