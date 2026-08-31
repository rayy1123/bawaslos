'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Pair } from '@/lib/queries';
import type { Settings } from '@/lib/queries';
import { BallotIcon, ArrowRight } from '@/components/icons';
import LogoSeal from '@/components/LogoSeal';

type Props = {
  pairs: Pair[];
  isAdmin: boolean;
  settings: Settings;
};

export default function HomeClient({ pairs, settings }: Props) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Masthead: logo besar di tengah, nama di bawah, animasi */} 
      <header className="pb-5 text-center">
        <div className="flex flex-col items-center gap-4 transition-all duration-300">
          <LogoSeal
            src={settings.logo_url}
            className="h-60 w-60 logo-enter drop-shadow-sm transition-transform hover:scale-105"
            aria-hidden="true"
          />
          <div className="animate-name-fade">
            <span className="block font-serif text-5xl font-extrabold tracking-[0.12em] text-[#0b1f4b] sm:text-6xl">
              BAWASLOS
            </span>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#b0892f]">
              Badan Pengawas Pemilihan OSIS
            </p>
            <p className="mt-1 text-xs text-[#2c3e63]">{settings.org_subtitle || 'SMK Negeri 64 Jakarta'}</p>
          </div>
        </div>
      </header>

      {/* Editoial hero */}
      <section className="mt-10 text-center">
        <p className="label-official">Pemilihan Serentak · Periode 2026/2027</p>
        <h1 className="mx-auto mt-3 max-w-2xl font-serif text-4xl font-bold leading-tight text-[#0b1f4b] sm:text-5xl">
          Ketua &amp; Wakil Ketua OSIS
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#2c3e63]">
          Tiga pasangan calon akan berlaga. Pantau visi &amp; misi mereka, lalu masuk ke bilik suara
          melalui akun pemilih yang disediakan panitia pengawas.
        </p>
        <div className="mt-7 flex justify-center">
          <Link
            href="/login-pemilih"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f4b] px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#142c63]"
          >
            <BallotIcon className="h-4 w-4" />
            Masuk Bilik Suara
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Grid kandidat */}
      <section className="mt-14">
        <div className="flex items-center gap-4">
          <span className="label-official">Daftar Pasangan Calon</span>
          <hr className="rule-double flex-1" />
        </div>

        {pairs.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#0b1f4b]/20 bg-[#fbfaf6] p-8 text-center text-sm text-[#2c3e63]">
            Pasangan calon belum diisi admin.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pairs.map((p) => (
              <article key={p.id} className="pair-card flex flex-col overflow-hidden rounded-xl">
                <div className="relative">
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt={`Pasangan ${p.number}`} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center bg-[#0b1f4b]/5 font-serif text-5xl font-bold text-[#0b1f4b]/30">
                      {p.chair_name.trim().charAt(0) || '?'}
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded bg-[#0b1f4b] px-2.5 py-1 text-xs font-bold tracking-wide text-[#c9a64a]">
                    No. Urut {p.number}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-center font-serif text-lg font-bold text-[#0b1f4b]">
                    {p.chair_name || '—'}
                  </h3>
                  <p className="text-center text-xs uppercase tracking-wider text-[#b0892f]">
                    &amp; {p.vice_name || '—'}
                  </p>
                  <div className="mt-4 border-t border-[#0b1f4b]/10 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2c3e63]">Visi</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#2c3e63]">{p.vision || '—'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-12 text-center">
        <Link href="/scoreboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
          Lihat Scoreboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}