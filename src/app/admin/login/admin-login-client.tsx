'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminLoginAction } from '@/lib/actions';
import { SealIcon, LockIcon, ArrowRight } from '@/components/icons';
import LogoSeal from '@/components/LogoSeal';

export default function AdminLoginClient({
  logoUrl,
  orgName,
}: {
  logoUrl?: string | null;
  orgName?: string | null;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const fd = new FormData();
    fd.set('username', username);
    fd.set('password', password);
    const res = await adminLoginAction(fd);
    setBusy(false);
    if (res.ok) {
      window.location.href = '/admin';
    } else {
      setErr(res.error || 'Gagal login.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f3ec]">
      {/* Bar atas: kembali */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]"
        >
          <span className="text-base">⌂</span> Beranda
        </Link>
        <LogoSeal src={logoUrl} className="h-14 w-14" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#0b1f4b]/12 bg-white shadow-lg sm:grid-cols-2">
          {/* Kiri: konteks resmi */}
          <div className="hidden flex-col justify-between bg-[#0b1f4b] p-8 text-white sm:flex">
            <div>
              <p className="label-official">Admin Portal</p>
              <h2 className="mt-3 font-serif text-2xl font-bold leading-snug">
                Dasbor Pengawas Pemilihan
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Halaman ini dikhususkan bagi panitia pengawas. Masuk untuk mengatur pasangan calon,
                token pemilih, dan membuka hasil secara bertahap.
              </p>
            </div>
            <p className="text-xs text-white/50">
              Setiap tindakan dicatat dalam log audit. Jaga kerahasiaan kredensial Anda.
            </p>
          </div>

          {/* Kanan: form */}
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <LogoSeal src={logoUrl} className="h-36 w-36" />
              <h1 className="mt-3 text-2xl font-extrabold tracking-wide text-[#0b1f4b]">{orgName || 'BAWASLOS'}</h1>
              <p className="text-xs text-[#2c3e63]">{orgName || 'BAWASLOS'} — Admin Portal</p>
            </div>

            <div className="mt-6 border-b border-[#0b1f4b]/10 pb-2">
              <h2 className="text-base font-bold text-[#0b1f4b]">Login to Dashboard</h2>
              <div className="mt-1 h-0.5 w-16 rounded bg-[#0b1f4b]" />
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2c3e63]">Username / ID Panitia</label>
                <div className="mt-1 flex items-center rounded-lg border border-[#0b1f4b]/20 px-3 focus-within:border-[#0b1f4b]">
                  <SealIcon className="h-4 w-4 text-[#b0892f]" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your ID"
                    className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2c3e63]">Password</label>
                <div className="mt-1 flex items-center rounded-lg border border-[#0b1f4b]/20 px-3 focus-within:border-[#0b1f4b]">
                  <LockIcon className="h-4 w-4 text-[#b0892f]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-[#2c3e63]">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember Me
                </label>
                <a href="#" className="font-semibold text-[#0b1f4b] hover:text-[#b0892f]">Lupa Password?</a>
              </div>

              {err && <p className="text-sm font-medium text-[#8a2b2b]">{err}</p>}

              <button
                disabled={busy}
                className="btn-ink flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Masuk Dashboard <ArrowRight className="h-4 w-4" />
              </button>

              <p className="flex items-center justify-center gap-1 text-center text-[10px] text-[#2c3e63]/70">
                <LockIcon className="h-3 w-3" /> Data Anda dilindungi dan tidak dibagikan kepada pihak ketiga.
              </p>
            </form>

           
            <div className="mt-4 text-center">
              <Link href="/" className="text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
                ← Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-[#0b1f4b]/10 bg-[#fbfaf6] py-4 text-center text-[11px] text-[#2c3e63]">
        © 2024 Satuan Pengawasan Pemilihan Khusus KPPS (Bawaslos), Jujur dan Transparan.
      </footer>
    </div>
  );
}
