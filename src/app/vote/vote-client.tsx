'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { voterLoginAction, castVoteAction, voterLogoutAction } from '@/lib/actions';
import { SealIcon, BallotIcon } from '@/components/icons';
import SiteNav from '@/components/SiteNav';
import type { Pair, Account } from '@/lib/queries';

type Props = {
  pairs: Pair[];
  accounts: Account[];
  voterAccount: number | null;
  logoUrl?: string | null;
  votingOpen?: boolean;
  completedNo?: number | null;
};

type VoteStage = 'login' | 'voting' | 'completed' | 'already_voted';

export default function VoteClient({ pairs, accounts, voterAccount, logoUrl, votingOpen = true, completedNo = null }: Props) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(1);
  const [token, setToken] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [confirmPair, setConfirmPair] = useState<Pair | null>(null);
  const [votedNo, setVotedNo] = useState<number | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteErr, setVoteErr] = useState('');

  const currentStage =
    completedNo != null
      ? 'completed'
      : voterAccount == null
        ? 'login'
        : votedNo != null
          ? 'completed'
          : 'voting';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginErr('');
    const fd = new FormData();
    fd.set('accountId', String(accountId));
    fd.set('token', token);
    const res = await voterLoginAction(fd);
    setLoginBusy(false);
    if (res.ok) {
      setToken('');
      setVotedNo(null);
      router.refresh();
    } else setLoginErr(res.error || 'Gagal login.');
  }

  async function confirmVote() {
    if (!confirmPair) return;
    setVoteBusy(true);
    setVoteErr('');
    const fd = new FormData();
    fd.set('pairId', String(confirmPair.id));
    const res = await castVoteAction(fd);
    setVoteBusy(false);
    if (res.ok) {
      setVotedNo(res.voter_no ?? null);
      setPicked(confirmPair.id);
      setConfirmPair(null);
      // Tampilkan layar "selesai" via query param (server-rendered, tahan refresh).
      router.push('/vote?done=' + (res.voter_no ?? ''));
    } else {
      setVoteErr(res.error || 'Gagal memilih.');
      setConfirmPair(null);
      router.refresh();
    }
  }

  async function handleLogout() {
    await voterLogoutAction();
    setVotedNo(null);
    setPicked(null);
    setConfirmPair(null);
    setLoginErr('');
    setVoteErr('');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec]">
      <SiteNav logoUrl={logoUrl} />

      {!votingOpen ? (
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-4xl text-[#b0892f]"><SealIcon className="mx-auto h-12 w-12" /></p>
          <h1 className="mt-4 font-serif text-2xl font-bold text-[#0b1f4b]">Pemilihan Belum Dimulai</h1>
          <p className="mt-2 text-sm text-slate-600">
            Halaman pemilihan sedang ditutup oleh pengawas. Silakan kembali saat pemilihan telah dibuka.
          </p>
          <div className="mt-6">
            <Link href="/" className="text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
              ← Kembali ke Beranda
            </Link>
          </div>
        </main>
      ) : (
      <>
      {/* Status bar */}
      <div className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 text-sm">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="text-base text-[#0b1f4b]"><SealIcon className="h-4 w-4" /></span>
            Akun Pemilih: <b>{voterAccount != null ? `Akun ${voterAccount}` : '—'}</b>
          </span>
          {voterAccount != null && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg> Sesi Terverifikasi
            </span>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {currentStage === 'login' ? (
          // ----- LOGIN -----
          <section className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <h2 className="text-lg font-bold text-[#0b1f4b]">Masuk dengan Token</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pilih akun pemilih yang disediakan, lalu masukkan token yang diberikan admin pengawas.
            </p>
            <form onSubmit={handleLogin} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Akun Pemilih</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0b1f4b] focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={!a.has_token}>
                      {a.label} {a.has_token ? '' : '(token belum dibuat)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Token</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="16 huruf/angka"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-[#0b1f4b] focus:outline-none"
                  autoFocus
                />
              </div>
              {loginErr && <p className="text-sm font-medium text-red-600">{loginErr}</p>}
              <button
                disabled={loginBusy}
                className="w-full rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white hover:bg-[#142c63] disabled:opacity-50"
              >
                {loginBusy ? 'Memeriksa…' : 'Masuk'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/" className="text-xs font-semibold text-[#0b1f4b] underline">
                ← Kembali ke Beranda
              </Link>
            </div>
          </section>
        ) : currentStage === 'voting' ? (
          // ----- TAMPILAN VOTING -----
          <section>
            <h1 className="text-center text-3xl font-extrabold text-[#0b1f4b]">Pemilihan Ketua OSIS</h1>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">
              Silakan pilih kandidat yang menurut Anda paling tepat untuk memimpin OSIS periode ini.
              Pilihan Anda bersifat rahasia dan final.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {pairs.map((p) => (
                <div key={p.id} className="pair-card flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                  <div className="relative">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={`Pasangan ${p.number}`} className="h-44 w-full object-cover" />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center bg-slate-100 text-4xl font-extrabold text-slate-300">
                        {p.chair_name.trim().charAt(0) || '?'}
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-md bg-[#0b1f4b] px-2 py-1 text-xs font-bold text-white">
                      No. Urut {p.number}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-center text-base font-bold text-[#0b1f4b]">
                      {p.chair_name || '—'} & {p.vice_name || '—'}
                    </h3>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600">
                      <b>Visi:</b> {p.vision || '—'}
                    </p>
                    <button
                      disabled={voteBusy}
                      onClick={() => setConfirmPair(p)}
                      className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#0b1f4b] py-2.5 text-sm font-bold text-white hover:bg-[#142c63] disabled:opacity-60"
                    >
                      <BallotIcon className="h-4 w-4" /> Pilih Kandidat {p.number}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {voteErr && <p className="mt-4 text-center text-sm font-medium text-red-600">{voteErr}</p>}
          </section>
        ) : currentStage === 'completed' ? (
          // ----- SUDAH MEMILIH -----
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-[#0b1f4b]/20 bg-white p-8 text-center shadow-md">
            <p className="text-5xl text-[#b0892f]"><SealIcon className="h-12 w-12" /></p>
            <h2 className="mt-3 text-xl font-extrabold text-[#0b1f4b]">Anda Telah Selesai Melakukan Pemilihan</h2>
            <p className="mt-2 text-slate-700">
              Terima kasih. Suara Anda (Pemilih ke-{completedNo ?? votedNo}, melalui Akun {voterAccount ?? completedNo ?? '—'}) telah tercatat.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Pilihan bersifat rahasia dan final. Sesi telah berakhir.
            </p>
            <div className="mt-4 rounded-lg border border-[#b0892f] bg-[#fbf6ea] px-4 py-3 text-sm text-[#0b1f4b]">
              Untuk memasukkan token akun berikutnya, silakan kembali ke halaman voting.
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/vote" className="rounded-lg bg-[#0b1f4b] px-5 py-2 text-sm font-bold text-white hover:bg-[#142c63]">
                ← Kembali ke Halaman Voting
              </Link>
              <Link href="/scoreboard" className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Lihat Scoreboard
              </Link>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-[#0b1f4b]/15 bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-5 text-xs text-[#2c3e63] sm:flex-row sm:justify-between">
          <span className="font-extrabold text-[#b0892f]">BAWASLOS</span>
          <span>© 2024 Badan Pengawas Pemilihan Ketua OSIS (Bawaslos). Jurdil dan Transparan.</span>
          <div className="flex gap-3">
            <Link href="/panduan" className="hover:text-[#b0892f]">Panduan Memilih</Link>
            <Link href="/panduan" className="hover:text-[#0b1f4b]">Syarat & Ketentuan</Link>
            <Link href="/panduan" className="hover:text-[#0b1f4b]">Kontak Panitia</Link>
          </div>
        </div>
      </footer>

      {/* Konfirmasi modal */}
      {confirmPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="text-4xl text-[#b0892f]"><SealIcon className="h-10 w-10" /></p>
            <h3 className="mt-2 text-lg font-bold text-[#0b1f4b]">Konfirmasi Pilihan</h3>
            <p className="mt-1 text-sm text-slate-600">
              Anda akan memilih <b>Pasangan #{confirmPair.number}</b>
              <br />
              <span className="font-semibold text-[#0b1f4b]">
                {confirmPair.chair_name} & {confirmPair.vice_name}
              </span>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Pilihan bersifat rahasia dan final. Setelah dikonfirmasi, sesi akan berakhir.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => setConfirmPair(null)}
                disabled={voteBusy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={confirmVote}
                disabled={voteBusy}
                className="rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white hover:bg-[#142c63] disabled:opacity-50"
              >
                {voteBusy ? 'Mencatat…' : 'Ya, Pilih'}
              </button>
            </div>
          </div>
        </div>
      )}
      </> 
      )}
    </div>
  );
}