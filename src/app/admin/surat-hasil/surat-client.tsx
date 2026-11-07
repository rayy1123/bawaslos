'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Pair, Settings, ScoreboardState, MilestoneStep } from '@/lib/queries';
import LogoSeal from '@/components/LogoSeal';

type Props = {
  settings: Settings;
  scoreboard: ScoreboardState;
  pairs: Pair[];
  votersStats: { total: number; used: number; unused: number; turnout: number };
  milestoneData: {
    milestones: MilestoneStep[];
    totalRevealed: number;
    finalTally: {
      pair_id: number;
      number: number;
      chair_name: string;
      vice_name: string;
      votes: number;
      percent: number;
    }[];
  };
  currentStepInterval: number;
  currentLimit: number;
};

export default function SuratClient({
  settings,
  scoreboard,
  pairs,
  votersStats,
  milestoneData,
  currentStepInterval,
  currentLimit,
}: Props) {
  const router = useRouter();

  // Document metadata customization states
  const [docNumber, setDocNumber] = useState('024/BA-PEMILOS/SMKN64/XI/2026');
  const [docDate, setDocDate] = useState(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });
  const [docPlace, setDocPlace] = useState('Jakarta');
  const [customStep, setCustomStep] = useState(currentStepInterval);

  // Signatories
  const pjDeviceName = 'Rayvanes Arrasyid';
  const ketuaPanitiaName = 'Muhammad Rezki Ramadhan';
  const wakasekKesiswaanName = 'Marjianto, S.Pd';

  const { milestones, totalRevealed, finalTally } = milestoneData;
  const totalVotesCast = scoreboard.total;

  // Leading pair calculation
  const sortedTally = [...finalTally].sort((a, b) => b.votes - a.votes);
  const leadingPair = sortedTally[0];
  const runnerUp = sortedTally[1];
  const isTie = leadingPair && runnerUp && leadingPair.votes === runnerUp.votes && leadingPair.votes > 0;

  function handleFilterChange(newStep: number) {
    setCustomStep(newStep);
    router.push(`/admin/surat-hasil?step=${newStep}&limit=${currentLimit}`);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 font-formal-doc print:bg-white print:p-0 print:m-0">
      {/* 1. TOP ACTION BAR (Hidden when printing / PDF export) */}
      <div className="no-print mx-auto mb-6 max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-sans">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#0b1f4b] px-2.5 py-0.5 text-[10px] font-bold text-[#c9a64a]">
                GENERATOR RESMI
              </span>
              <h1 className="text-base sm:text-lg font-bold text-[#0b1f4b]">
                Surat Berita Acara &amp; Rekapitulasi Suara
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Dokumen resmi akumulasi pengumuman per 10 suara pemilihan ketua &amp; wakil ketua OSIS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Dashboard
            </Link>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b1f4b] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#142c63] active:scale-95 transition-all"
            >
              🖨️ Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Interval Akumulasi:</span>
            {[5, 10, 20].map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  customStep === s
                    ? 'bg-[#0b1f4b] text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Per {s} Suara
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">
              Suara Diumumkan: <b>{totalRevealed}</b> / {totalVotesCast} suara
            </span>
          </div>
        </div>
      </div>

      {/* 2. THE OFFICIAL PHYSICAL DOCUMENT CONTAINER (A4 Paper Print Ready) */}
      <article className="mx-auto max-w-4xl bg-white p-8 sm:p-14 shadow-lg border border-slate-200/80 text-black print:p-0 print:border-0 print:shadow-none print:max-w-full">
        {/* KOP SURAT RESMI */}
        <header className="border-b-4 border-double border-black pb-3 text-center">
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center">
              <LogoSeal src={settings.logo_url} className="h-20 w-20" />
            </div>

            <div className="flex-1 text-center">
              <p className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                Pemerintah Provinsi Daerah Khusus Ibukota Jakarta
              </p>
              <p className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                Dinas Pendidikan
              </p>
              <h2 className="text-base sm:text-xl font-extrabold tracking-wide uppercase">
                Sekolah Menengah Kejuruan Negeri 64 Jakarta
              </h2>
              <p className="text-xs sm:text-sm font-bold tracking-widest text-[#0b1f4b] uppercase">
                Badan Pengawas Pemilihan Ketua Osis ({settings.org_name || 'Bawaslos'})
              </p>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-sans">
                {settings.org_subtitle || 'Jalan Matraman Raya No. 177, Jakarta Timur'} | Website: smkn64jkt.sch.id
              </p>
            </div>

            <div className="flex h-24 w-24 shrink-0 items-center justify-center">
              {/* Logo Resmi SMK Negeri 64 Jakarta */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-smkn64.png"
                alt="Logo SMK Negeri 64 Jakarta"
                className="h-24 w-auto max-h-24 max-w-24 object-contain"
              />
            </div>
          </div>
        </header>

        {/* JUDUL DOKUMEN & NOMOR BERITA ACARA */}
        <section className="mt-6 text-center">
          <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-wide underline">
            Berita Acara &amp; Rekapitulasi Hasil Pengumuman Suara
          </h3>
          <p className="text-xs sm:text-sm font-bold mt-1 uppercase">
            Pemilihan Ketua &amp; Wakil Ketua OSIS Periode 2026/2027
          </p>
          <div className="no-print mt-1 inline-flex items-center gap-1 font-sans text-xs text-slate-500">
            <span>Nomor:</span>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="rounded border border-slate-300 px-2 py-0.5 font-mono text-xs font-bold text-black"
            />
          </div>
          <p className="hidden print:block text-xs font-mono font-bold mt-0.5">
            Nomor: {docNumber}
          </p>
        </section>

        {/* PARAGRAF PEMBUKA */}
        <section className="mt-6 text-xs sm:text-sm leading-relaxed text-justify">
          <p>
            Pada hari ini, tanggal <b>{docDate}</b>, bertempat di Tempat Pemungutan Suara (TPS) SMK Negeri 64
            Jakarta, Panitia Penyelenggara Pemilihan Ketua dan Wakil Ketua OSIS bersama Badan Pengawas Pemilihan
            telah melaksanakan pemungutan suara elektronik, rekapitulasi data, serta pengumuman suara secara bertahap
            dengan prinsip <b>Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil (LUBER JURDIL)</b>.
          </p>
          <p className="mt-2">
            Berdasarkan hasil pencatatan sistem basis data elektronik yang sah, diperoleh data partisipasi sebagai berikut:
          </p>
          <ul className="mt-1 ml-5 list-disc space-y-0.5 text-xs sm:text-sm">
            <li>Total Daftar Pemilih Tetap (DPT) Terdaftar: <b>{votersStats.total} Pemilih</b></li>
            <li>Jumlah Suara Masuk di Bilik Suara: <b>{totalVotesCast} Suara</b> (Partisipasi: {votersStats.turnout}%)</li>
            <li>Jumlah Suara Sah yang Telah Diumumkan (Reveal): <b>{totalRevealed} Suara</b></li>
          </ul>
        </section>

        {/* BAGIAN I: REKAPITULASI HASIL SUARA SAH */}
        <section className="mt-6">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-black pb-1">
            I. Rekapitulasi Perolehan Suara Pasangan Calon
          </h4>

          <table className="mt-2.5 w-full border-collapse border border-black text-center text-xs sm:text-sm">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-black px-3 py-2 w-16">No. Urut</th>
                <th className="border border-black px-4 py-2 text-left">Nama Pasangan Calon (Ketua &amp; Wakil)</th>
                <th className="border border-black px-3 py-2 w-28">Perolehan Suara</th>
                <th className="border border-black px-3 py-2 w-24">Persentase</th>
                <th className="border border-black px-3 py-2 w-32">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {finalTally.map((row) => (
                <tr key={row.pair_id} className="hover:bg-slate-50">
                  <td className="border border-black px-3 py-2.5 font-bold">
                    {String(row.number).padStart(2, '0')}
                  </td>
                  <td className="border border-black px-4 py-2.5 text-left font-bold">
                    {row.chair_name} &amp; {row.vice_name}
                  </td>
                  <td className="border border-black px-3 py-2.5 font-mono font-bold">
                    {row.votes.toLocaleString('id-ID')}
                  </td>
                  <td className="border border-black px-3 py-2.5 font-mono font-bold">
                    {row.percent}%
                  </td>
                  <td className="border border-black px-3 py-2.5 text-xs">
                    {leadingPair && leadingPair.number === row.number && !isTie
                      ? 'Unggul Sementara'
                      : isTie
                      ? 'Perolehan Seri'
                      : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={2} className="border border-black px-4 py-2 text-right">
                  TOTAL SUARA SAH DIUMUMKAN:
                </td>
                <td className="border border-black px-3 py-2 font-mono">
                  {totalRevealed.toLocaleString('id-ID')}
                </td>
                <td className="border border-black px-3 py-2 font-mono">
                  100%
                </td>
                <td className="border border-black px-3 py-2 text-xs">
                  Sah &amp; Terverifikasi
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* BAGIAN II: AKUMULASI PENGUMUMAN PER 10 SUARA (REVEAL PROGRESSION) */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between border-b border-black pb-1">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
              II. Laporan Akumulasi Progres Per {customStep} Suara Diumumkan
            </h4>
            <span className="text-[11px] font-sans text-slate-500 print:text-black">
              Total {milestones.length} Tahap Pengumuman
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-600 print:text-black text-justify">
            Tabel berikut merinci akumulasi perolehan suara setiap kelipatan {customStep} suara yang dibuka oleh
            pengawas untuk memastikan transparansi dan akuntabilitas penghitungan bertahap:
          </p>

          <table className="mt-2.5 w-full border-collapse border border-black text-center text-xs">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-black px-2 py-1.5 w-12">Tahap</th>
                <th className="border border-black px-2 py-1.5 w-28">Akumulasi Suara</th>
                {pairs.map((p) => (
                  <th key={p.number} className="border border-black px-2 py-1.5">
                    Paslon {p.number} ({p.chair_name.split(' ')[0]})
                  </th>
                ))}
                <th className="border border-black px-3 py-1.5 text-left">Posisi Memimpin</th>
                <th className="border border-black px-2 py-1.5 w-20">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {milestones.length === 0 ? (
                <tr>
                  <td colSpan={3 + pairs.length} className="border border-black p-4 text-slate-400">
                    Belum ada suara yang diumumkan (reveal) saat ini.
                  </td>
                </tr>
              ) : (
                milestones.map((m) => (
                  <tr key={m.step} className="hover:bg-slate-50">
                    <td className="border border-black px-2 py-1.5 font-bold">
                      #{m.step}
                    </td>
                    <td className="border border-black px-2 py-1.5 font-mono">
                      Suara 1 s.d. {m.upToVoterNo}
                    </td>
                    {m.tally.map((t) => (
                      <td key={t.number} className="border border-black px-2 py-1.5 font-mono">
                        <b>{t.votes}</b> ({t.percent}%)
                      </td>
                    ))}
                    <td className="border border-black px-3 py-1.5 text-left font-medium">
                      {m.leaderNumber ? `Paslon ${m.leaderNumber} (${m.leaderNames})` : m.leaderNames}
                    </td>
                    <td className="border border-black px-2 py-1.5 font-mono font-bold">
                      +{m.margin}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* PERNYATAAN PENUTUP */}
        <section className="mt-6 text-xs sm:text-sm leading-relaxed text-justify">
          <p>
            Demikian Berita Acara dan Surat Hasil Pengumuman ini dibuat dan disahkan dengan penuh tanggung jawab
            tanpa ada paksaan dari pihak mana pun. Dokumen ini sah dan memiliki kekuatan hukum sebagai arsip
            resmi hasil Pemilihan Ketua dan Wakil Ketua OSIS SMK Negeri 64 Jakarta.
          </p>
        </section>

        {/* TANGGAL DAN LEMBAR PENGESAHAN TANDA TANGAN (3 PIHAK) */}
        <section className="mt-8">
          <div className="text-right text-xs sm:text-sm mb-4">
            <span className="no-print">
              Tempat, Tanggal:
              <input
                type="text"
                value={`${docPlace}, ${docDate}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  if (parts[0]) setDocPlace(parts[0].trim());
                  if (parts[1]) setDocDate(parts[1].trim());
                }}
                className="ml-1 rounded border border-slate-300 px-2 py-0.5 font-serif text-xs font-semibold"
              />
            </span>
            <span className="hidden print:inline font-semibold">
              {docPlace}, {docDate}
            </span>
          </div>

          {/* SIGNATURE GRID: 2 COLUMNS TOP (PJ DEVICE & KETUA PANITIA), 1 CENTER BOTTOM (WAKASEK KESISWAAN) */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8 text-center text-xs sm:text-sm">
              {/* Signatory 1: PJ Device & Ketua TPS (Rayvanes Arrasyid) */}
              <div className="flex flex-col items-center">
                <p className="font-semibold text-slate-700 print:text-black">
                  Penanggung Jawab Device &amp; Ketua TPS,
                </p>
                <div className="h-20 sm:h-24 flex items-end justify-center">
                  {/* Space for physical signature / stamp */}
                  <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan &amp; Stempel)</span>
                </div>
                <p className="font-bold underline text-sm sm:text-base tracking-wide">
                  {pjDeviceName}
                </p>
                <p className="text-[11px] text-slate-500 print:text-black">
                  Panitia Bidang Teknis &amp; TPS
                </p>
              </div>

              {/* Signatory 2: Ketua Panitia Pemilihan (Muhammad Rezki Ramadhan) */}
              <div className="flex flex-col items-center">
                <p className="font-semibold text-slate-700 print:text-black">
                  Ketua Panitia Pemilihan OSIS,
                </p>
                <div className="h-20 sm:h-24 flex items-end justify-center">
                  {/* Space for physical signature */}
                  <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan &amp; Stempel)</span>
                </div>
                <p className="font-bold underline text-sm sm:text-base tracking-wide">
                  {ketuaPanitiaName}
                </p>
                <p className="text-[11px] text-slate-500 print:text-black">
                  Ketua Pelaksana Pemilos
                </p>
              </div>
            </div>

            {/* Signatory 3: Mengetahui Wakil Bidang Kesiswaan (Marjianto, S.Pd) */}
            <div className="flex flex-col items-center text-center text-xs sm:text-sm pt-2">
              <p className="font-semibold text-slate-700 print:text-black">
                Mengetahui &amp; Mengesahkan,
              </p>
              <p className="font-bold uppercase tracking-wider text-xs">
                Wakil Kepala Sekolah Bidang Kesiswaan
              </p>
              <div className="h-20 sm:h-24 flex items-end justify-center">
                {/* Space for official school signature and stamp */}
                <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan &amp; Cap Sekolah)</span>
              </div>
              <p className="font-bold underline text-sm sm:text-base tracking-wide">
                {wakasekKesiswaanName}
              </p>
              <p className="text-[11px] text-slate-500 print:text-black font-sans">
                NIP. ............................................................
              </p>
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
