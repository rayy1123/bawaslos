import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/session';
import { listVoters, getSettings } from '@/lib/queries';
import LogoSeal from '@/components/LogoSeal';
import PrintButton from './print-button';

export const dynamic = 'force-dynamic';

export default async function CetakTokenPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const { voters, total } = await listVoters({ limit: 10000 });
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans print:bg-white print:p-0">
      {/* Top action bar (disembunyikan saat cetak) */}
      <header className="no-print mx-auto mb-6 flex max-w-5xl items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-[#0b1f4b]">Cetak Slip Token Pemilih</h1>
          <p className="text-xs text-slate-500">
            Total {total} kartu token pemilih siap dipotong dan dibagikan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Kembali ke Dashboard
          </Link>
          <a
            href="/api/export-voters?format=csv"
            className="rounded-lg border border-[#b0892f] bg-[#fbf6ea] px-4 py-2 text-xs font-bold text-[#0b1f4b] hover:bg-[#f6ebd4]"
          >
            📥 Unduh Excel / CSV
          </a>
          <PrintButton />
        </div>
      </header>

      {voters.length === 0 ? (
        <div className="no-print mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">Belum ada token pemilih yang digenerate.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-semibold text-[#0b1f4b] underline"
          >
            Buka Dashboard Admin untuk generate token 1-300
          </Link>
        </div>
      ) : (
        <main className="mx-auto max-w-5xl">
          {/* Grid kartu slip token pemilih */}
          <div className="grid grid-cols-2 gap-3.5 print:grid-cols-2 print:gap-2">
            {voters.map((v) => (
              <div
                key={v.id}
                className="slip-card flex flex-col justify-between rounded-xl border-2 border-dashed border-slate-400 bg-white p-3.5 shadow-sm print:rounded-none print:border-slate-500 print:p-2.5 print:shadow-none"
                style={{ pageBreakInside: 'avoid' }}
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <LogoSeal src={settings.logo_url} className="h-7 w-7" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#0b1f4b]">
                        {settings.org_name || 'BAWASLOS'}
                      </p>
                      <p className="text-[8px] text-slate-500">KARTU PEMILIH OSIS</p>
                    </div>
                  </div>
                  <span className="rounded bg-[#0b1f4b] px-2 py-0.5 font-mono text-xs font-extrabold text-[#c9a64a]">
                    No. {String(v.voter_no).padStart(3, '0')}
                  </span>
                </div>

                <div className="my-2.5 text-center">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                    KODE TOKEN RAHASIA
                  </span>
                  <div className="mt-1 rounded-lg border border-[#b0892f] bg-[#fbf6ea] py-1.5 font-mono text-xl font-extrabold tracking-[0.3em] text-[#0b1f4b]">
                    {v.token}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[8px] text-slate-500">
                  <span>Bawa ke bilik suara</span>
                  <span>1 Token = 1 Kali Memilih</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
