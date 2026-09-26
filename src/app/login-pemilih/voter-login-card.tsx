'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { voterLoginAction, listAccountsAction } from '@/lib/actions';
import { CheckIcon, LockIcon, BallotIcon, ArrowRight, SealIcon } from '@/components/icons';
import LogoSeal from '@/components/LogoSeal';

type Props = {
  logoUrl?: string | null;
  mascotUrl?: string | null;
  orgName?: string | null;
};

export default function VoterLoginCard({ logoUrl, mascotUrl, orgName }: Props) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(1);
  const [token, setToken] = useState('');
  const [accounts, setAccounts] = useState<{ id: number; label: string; has_token: boolean }[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function openForm() {
    const acc = await listAccountsAction();
    setAccounts(acc);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const fd = new FormData();
    fd.set('accountId', String(accountId));
    fd.set('token', token);
    const res = await voterLoginAction(fd);
    setBusy(false);
    if (res.ok) router.push('/vote');
    else setErr(res.error || 'Gagal masuk.');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f3ec]">
      {/* Bar atas: kembali */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
          <span className="text-base">⌂</span> Beranda
        </Link>
        <LogoSeal src={logoUrl} className="h-12 w-12" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#0b1f4b]/12 bg-white shadow-lg sm:grid-cols-2">
          {/* Kiri: konteks */}
          <div className="hidden flex-col justify-between bg-[#0b1f4b] p-8 text-white sm:flex">
            <div>
              <p className="label-official text-[#c9a64a]">Bilik Suara</p>
              <h2 className="mt-3 font-serif text-2xl font-bold leading-snug">Masuk &amp; Gunakan Hak Suara</h2>
              <p className="mt-3 text-sm text-white/70">
                Setiap akun pemilih hanya dapat memberikan satu suara. Token bersifat rahasia dan
                diberikan langsung oleh panitia pengawas.
              </p>
            </div>
            <p className="text-xs text-white/50">
              Suara Anda tercatat anonym dengan nomor urut pemilih, bukan nama.
            </p>
          </div>

          {/* Kanan: form */}
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mascotUrl || "/maskot.png"} alt="Pengawas" className="h-24 w-auto rounded-xl object-contain" />
              <h1 className="mt-2 text-2xl font-extrabold text-[#0b1f4b]">Masuk Bilik Suara</h1>
              <p className="text-xs text-[#2c3e63]">{orgName || 'BAWASLOS'} — E-Voting</p>
            </div>

            <p className="mt-4 text-center text-sm text-[#2c3e63]">
              Masukkan Token Pemilih rahasia Anda untuk memulai.
            </p>

            <form onSubmit={handleSubmit} onFocus={openForm} className="mt-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2c3e63]">Terminal / Bilik Suara</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[#0b1f4b]/20 bg-slate-50 px-3 py-2 text-sm font-semibold text-[#0b1f4b] focus:border-[#0b1f4b] focus:outline-none"
                >
                  <option value={1}>Bilik Suara 1</option>
                  <option value={2}>Bilik Suara 2</option>
                  <option value={3}>Bilik Suara 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2c3e63]">Token Pemilih</label>
                <div className="mt-1 flex items-center rounded-lg border border-[#0b1f4b]/20 px-3 focus-within:border-[#0b1f4b]">
                  <LockIcon className="h-4 w-4 text-[#b0892f]" />
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    placeholder="8 karakter token"
                    maxLength={12}
                    className="w-full bg-transparent px-2 py-2 text-sm uppercase tracking-widest outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {err && <p className="text-sm font-medium text-[#8a2b2b]">{err}</p>}

              <button
                disabled={busy}
                className="btn-ink flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <BallotIcon className="h-4 w-4" /> Masukkan Token
              </button>
              <button
                type="button"
                onClick={() => router.push('/vote')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#0b1f4b]/20 px-4 py-2.5 text-sm font-semibold text-[#0b1f4b] hover:bg-[#f6f3ec]"
              >
                <CheckIcon className="h-4 w-4" /> Lihat TPS (tanpa login)
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-3 text-xs text-[#2c3e63]/70">
              <Link href="/" className="font-semibold text-[#0b1f4b] hover:text-[#b0892f]">← Beranda</Link>
              <span>·</span>
              <Link href="/scoreboard" className="font-semibold text-[#0b1f4b] hover:text-[#b0892f]">Scoreboard</Link>
            </div>

            <p className="mt-4 text-center text-[11px] text-[#2c3e63]/60">© 2024 {orgName || 'BAWASLOS'}. Jujur dan Transparan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
