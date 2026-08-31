import Link from 'next/link';
import { getRules } from '@/lib/queries';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default function PanduanPage() {
  const rules = getRules();
  const lines = rules.body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-[#0b1f4b] hover:underline">
          ← Beranda
        </Link>
        <Link href="/scoreboard" className="text-sm font-semibold text-[#0b1f4b] hover:underline">
          Scoreboard →
        </Link>
      </header>

      {/* Maskot pengawas menjelaskan panduan */}
      <section className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/maskot.png"
          alt="Maskot Bawaslos menjelaskan panduan pemilihan"
          className="h-44 w-auto rounded-xl object-contain sm:h-52"
        />
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0b1f4b]/70">
            Bawaslos Menjelaskan
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#0b1f4b]">{rules.headline}</h1>
          <p className="mt-2 text-sm text-slate-600">
    Simak peraturan &amp; tata cara pemilihan di bawah ini.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ol className="space-y-3">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b1f4b] text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700">{line.replace(/^\d+\.\s*/, '')}</span>
            </li>
          ))}
          {lines.length === 0 && (
            <li className="text-sm text-slate-400">Panduan belum diisi admin.</li>
          )}
        </ol>
      </section>
      </main>
    </AppShell>
  );
}
