'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoSeal from '@/components/LogoSeal';
import { MenuIcon, CloseIcon } from '@/components/icons';

const NAV = [
  { href: '/', label: 'Kandidat' },
  { href: '/berita', label: 'Berita' },
  { href: '/panduan', label: 'Panduan' },
  { href: '/timer', label: 'Timer' },
  { href: '/vote', label: 'Voting' },
  { href: '/scoreboard', label: 'Scoreboard' },
];

type Props = { logoUrl?: string | null; orgName?: string | null };

export default function SiteNav({ logoUrl, orgName }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHome = pathname === '/';
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#0b1f4b]/10 bg-[#f6f3ec]/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex h-12 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 micro-btn"
            aria-label="Beranda Bawaslos"
          >
            <LogoSeal src={logoUrl} className={`h-9 w-9 ${isHome ? 'seal-rise' : ''}`} />
            <span className={`text-lg font-bold text-[#0b1f4b] ${isHome ? 'brand-slide' : ''}`}>
              {orgName || 'BAWASLOS'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 sm:flex" role="navigation" aria-label="Navigasi utama">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`micro-btn rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#b0892f] ${
                  isActive(l.href)
                    ? 'bg-[#0b1f4b] text-white shadow-xs'
                    : 'text-[#0b1f4b] hover:bg-[#b0892f]/10 hover:text-[#b0892f]'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/login"
              className="micro-btn hidden rounded-xl bg-[#b0892f] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#9c7826] sm:inline-flex"
            >
              Portal Admin
            </Link>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="micro-btn flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-[#0b1f4b] sm:hidden shadow-xs"
              aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            >
              {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mt-3 border-t border-slate-200/80 pt-3 pb-2 sm:hidden animate-fade-in">
            <nav className="flex flex-col space-y-1">
              {NAV.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`micro-btn flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive(l.href)
                      ? 'bg-[#0b1f4b] text-white shadow-xs'
                      : 'text-[#0b1f4b] hover:bg-[#b0892f]/10 hover:text-[#b0892f]'
                  }`}
                >
                  <span>{l.label}</span>
                  {isActive(l.href) && <span className="h-1.5 w-1.5 rounded-full bg-[#c9a64a]" />}
                </Link>
              ))}

              <div className="pt-2">
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="micro-btn flex w-full items-center justify-center rounded-xl bg-[#b0892f] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#9c7826]"
                >
                  Portal Admin
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
