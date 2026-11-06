'use client';

import Link from 'next/link';
import type { Pair, Settings } from '@/lib/queries';
import { BallotIcon, ArrowRight, SealIcon, CheckIcon } from '@/components/icons';
import LogoSeal from '@/components/LogoSeal';

type Props = {
  pairs: Pair[];
  isAdmin: boolean;
  settings: Settings;
};

export default function HomeClient({ pairs, settings }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 1. Hero & Masthead Section */}
      <section className="relative overflow-hidden rounded-3xl border border-[#0b1f4b]/10 bg-gradient-to-b from-white to-[#faf8f3] p-6 text-center shadow-xs sm:p-12">
        {/* Decorative civic ambient background glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#b0892f]/10 blur-3xl" />

        <div className="relative flex flex-col items-center">
          {/* Official Emblem Logo */}
          <div className="relative group">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#b0892f]/30 to-[#0b1f4b]/20 blur-sm transition-all group-hover:blur-md" />
            <LogoSeal
              src={settings.logo_url}
              className="relative h-28 w-28 sm:h-36 sm:w-36 drop-shadow-md transition-transform duration-300 hover:scale-105"
            />
          </div>

          {/* Org Titles */}
          <div className="mt-4">
            <span className="inline-block rounded-full border border-[#b0892f]/30 bg-[#fbf6ea] px-3.5 py-1 text-[11px] font-bold tracking-widest text-[#0b1f4b] uppercase">
              {settings.org_name || 'BAWASLOS'}
            </span>
            <h1 className="mt-2 font-serif text-3xl font-extrabold tracking-tight text-[#0b1f4b] sm:text-5xl">
              Pemilihan Ketua &amp; Wakil Ketua OSIS
            </h1>
            <p className="mx-auto mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b0892f] sm:text-sm">
              {settings.org_subtitle || 'Badan Pengawas Pemilihan OSIS — SMK Negeri 64 Jakarta'}
            </p>
          </div>

          {/* Editorial lead */}
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#2c3e63] sm:text-base">
            Gunakan hak suara Anda secara demokratis, aman, dan rahasia. Kenali visi serta misi setiap pasangan
            calon sebelum memberikan suara di bilik pemilihan digital.
          </p>

          {/* Call to Actions */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login-pemilih"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f4b] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#142c63] hover:shadow-lg active:scale-98"
            >
              <BallotIcon className="h-4 w-4 text-[#c9a64a]" />
              Masuk Bilik Suara
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/scoreboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#0b1f4b] shadow-xs transition-colors hover:bg-slate-50"
            >
              📊 Live Scoreboard
            </Link>

            <Link
              href="/panduan"
              className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-slate-600 hover:text-[#b0892f]"
            >
              Tata Cara Memilih →
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Trust Pillars / Asas Pemilihan Strip */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1f4b]/10 text-lg text-[#0b1f4b]">
            🛡️
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#0b1f4b]">Asas LUBER JURDIL</h2>
            <p className="text-[11px] text-slate-500">Langsung, umum, bebas, rahasia, jujur, dan adil.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg text-[#b0892f]">
            🔐
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#0b1f4b]">Token Single-Use</h2>
            <p className="text-[11px] text-slate-500">1 Pemilih = 1 kode token unik sekali pakai.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
            📊
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#0b1f4b]">Hasil Transparan</h2>
            <p className="text-[11px] text-slate-500">Perhitungan suara diawasi dan tercatat di audit log.</p>
          </div>
        </div>
      </section>

      {/* 3. Candidate Pairs (Pasangan Calon) */}
      <section className="mt-12 sm:mt-16">
        <div className="text-center">
          <span className="label-official">Kandidat Pemimpin</span>
          <h2 className="mt-1.5 font-serif text-2xl font-bold text-[#0b1f4b] sm:text-3xl">
            Daftar Pasangan Calon
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-600 sm:text-sm">
            Pelajari profil, kepemimpinan, dan visi misi masing-masing kandidat sebelum Anda menentukan pilihan.
          </p>
        </div>

        {pairs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#0b1f4b]/20 bg-white p-12 text-center text-sm text-slate-500">
            Daftar pasangan calon belum diterbitkan oleh panitia.
          </div>
        ) : (
          <div className={`mt-8 grid gap-6 ${pairs.length === 2 ? 'max-w-4xl mx-auto sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {pairs.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#b0892f]/50 hover:shadow-lg"
              >
                {/* Photo & Number Badge */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photo_url}
                      alt={`Pasangan Calon No. ${p.number}`}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-5xl font-extrabold text-slate-300">
                      {p.number}
                    </div>
                  )}

                  {/* Gradient vignette for text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Paslon Number Badge */}
                  <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-xl bg-[#0b1f4b] px-3 py-1 shadow-md">
                    <span className="font-mono text-xs font-extrabold text-[#c9a64a]">
                      NO. URUT {String(p.number).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Bottom candidate names on photo banner */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                    <p className="text-[11px] font-medium tracking-wider text-slate-200 uppercase">
                      Calon Ketua &amp; Wakil Ketua
                    </p>
                    <h3 className="font-serif text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">
                      {p.chair_name} &amp; {p.vice_name}
                    </h3>
                  </div>
                </div>

                {/* Candidate Content Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    {/* Visi */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#b0892f]">
                        Visi &amp; Komitmen
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700 sm:text-[13px]">
                        {p.vision || 'Mewujudkan lingkungan OSIS yang inspiratif, inklusif, dan berprestasi.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-5 border-t border-slate-100 pt-3 text-center">
                    <Link
                      href="/login-pemilih"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-[#0b1f4b] transition-colors hover:bg-[#0b1f4b] hover:text-white"
                    >
                      Pilih Paslon Ini di Bilik Suara →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 4. Alur Pemilihan (3 Langkah Mudah) */}
      <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
        <div className="text-center">
          <span className="label-official">Tata Cara Pelaksanaan</span>
          <h2 className="mt-1 font-serif text-xl font-bold text-[#0b1f4b] sm:text-2xl">
            Alur Pemilihan di TPS Digital
          </h2>
          <p className="mx-auto mt-1 text-xs text-slate-500">
            Ikuti 3 tahapan berikut saat hari pemungutan suara berlangsung.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-[#faf9f5] p-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f4b] font-mono text-base font-bold text-white shadow-sm">
              1
            </span>
            <h3 className="mt-3 text-sm font-bold text-[#0b1f4b]">Registrasi &amp; Ambil Token</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Datangi panitia pengawas di TPS dan terima slip berisi 8 karakter token pemilih unik Anda.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-[#faf9f5] p-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f4b] font-mono text-base font-bold text-white shadow-sm">
              2
            </span>
            <h3 className="mt-3 text-sm font-bold text-[#0b1f4b]">Masuk ke Bilik Suara</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Kunjungi bilik suara yang tersedia, masukkan kode token pada layar terminal bilik suara.
            </p>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-[#faf9f5] p-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b1f4b] font-mono text-base font-bold text-white shadow-sm">
              3
            </span>
            <h3 className="mt-3 text-sm font-bold text-[#0b1f4b]">Coblos &amp; Selesai</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Tentukan paslon pilihan Anda dengan aman. Suara otomatis tercatat dan nomor urut tampil di layar.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Live Scoreboard Banner Callout */}
      <section className="mt-10 overflow-hidden rounded-3xl bg-[#0b1f4b] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div className="max-w-xl">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#c9a64a] uppercase">
              Transparansi Suara
            </span>
            <h2 className="mt-2 font-serif text-2xl font-bold leading-tight sm:text-3xl">
              Pantau Perolehan Suara Secara Real-Time
            </h2>
            <p className="mt-2 text-xs text-white/70 sm:text-sm">
              Hasil perhitungan suara dapat disaksikan secara terbuka melalui scoreboard digital resmi pengawas.
            </p>
          </div>

          <Link
            href="/scoreboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#c9a64a] px-6 py-3 text-sm font-bold text-[#0b1f4b] shadow-md transition-all hover:bg-[#d8b55c] active:scale-98"
          >
            Lihat Scoreboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
