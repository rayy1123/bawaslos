'use client';

type Props = {
  src?: string | null;
  className?: string;
};

// Emblem BAWASLOS: lingkaran emas solid (rim + fill sama), figur elang, timbangan,
// kotak suara, dan teks melengkung navy — semua ter-clip dalam satu bidang lingkaran.
// Tidak ada kotak hitam/putih. Tiga elemen tengah (elang, timbangan, kotak suara)
// dipisah vertikal dengan jelas dan sama beratnya.
function Emblem({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Seal Bawaslos">
      <defs>
        <clipPath id="emblem-clip">
          <circle cx="100" cy="100" r="95" />
        </clipPath>
        <path id="emblem-arc-top" d="M 20,100 A 80,80 0 0 1 180,100" fill="none" />
        <path id="emblem-arc-bottom" d="M 180,100 A 80,80 0 0 1 20,100" fill="none" />
      </defs>

      {/* Bidang emas solid */}
      <circle cx="100" cy="100" r="98" fill="#c5a059" />
      <circle cx="100" cy="100" r="98" fill="none" stroke="#8c6a1f" strokeWidth="4" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="#a8822f" strokeWidth="1.5" />

      {/* Isi ter-clip dalam lingkaran */}
      <g clipPath="url(#emblem-clip)">
        {/* ---- Elang (atas, lebih kecil) ---- */}
        <g fill="#0b1f4b">
          <circle cx="100" cy="40" r="4.5" />
          <path d="M104,39 L109,42 L104,45 Z" />
          <path d="M100,45 C95,48 94,57 98,63 C99,65 101,65 102,63 C106,57 105,48 100,45 Z" />
          <path d="M96,50 C84,47 73,52 66,61 C68,58 75,55 84,53 C89,52 93,52 96,53 Z" />
          <path d="M104,50 C116,47 127,52 134,61 C132,58 125,55 116,53 C111,52 107,52 104,53 Z" />
          <path d="M97,63 L100,70 L103,63 Z" />
        </g>

        {/* ---- Timbangan (tengah, tebal & lebar) ---- */}
        <g fill="none" stroke="#0b1f4b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="100" y1="80" x2="100" y2="108" />
          <line x1="74" y1="82" x2="126" y2="82" />
          {/* pan kiri */}
          <line x1="74" y1="82" x2="74" y2="92" />
          <path d="M64,92 L84,92 L79,101 L69,101 Z" fill="#0b1f4b" stroke="none" />
          {/* pan kanan */}
          <line x1="126" y1="82" x2="126" y2="92" />
          <path d="M116,92 L136,92 L131,101 L121,101 Z" fill="#0b1f4b" stroke="none" />
          {/* dasar */}
          <path d="M90,108 L110,108 L100,116 Z" fill="#0b1f4b" stroke="none" />
          <line x1="100" y1="116" x2="100" y2="120" />
        </g>

        {/* ---- Kotak suara (bawah) ---- */}
        <g fill="none" stroke="#0b1f4b" strokeWidth="2.6" strokeLinejoin="round">
          <rect x="84" y="132" width="32" height="24" rx="2" />
          <path d="M84,132 L92,125 L122,125 L114,132" />
          <line x1="94" y1="128" x2="106" y2="128" />
          <line x1="100" y1="139" x2="100" y2="149" />
        </g>
      </g>

      {/* Teks melengkung navy */}
      <text fill="#0b1f4b" fontSize="11.5" fontWeight="700" letterSpacing="0.8"
        fontFamily="Playfair Display, Georgia, serif">
        <textPath href="#emblem-arc-top" startOffset="50%" textAnchor="middle">
          BADAN PENGAWAS PEMILIHAN OSIS
        </textPath>
      </text>
      <text fill="#0b1f4b" fontSize="11.5" fontWeight="700" letterSpacing="0.8"
        fontFamily="Playfair Display, Georgia, serif">
        <textPath href="#emblem-arc-bottom" startOffset="50%" textAnchor="middle">
          SMK NEGERI 64 JAKARTA
        </textPath>
      </text>
    </svg>
  );
}

export default function LogoSeal({ src, className = 'h-10 w-10' }: Props) {
  if (src) {
    // Foto dari pengaturan: wadah lingkaran presisi, crop rapi (tidak distort).
    return (
      <span
        className={`inline-block aspect-square overflow-hidden rounded-full ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Seal Bawaslos"
          className="h-full w-full object-cover object-center"
        />
      </span>
    );
  }
  return <Emblem className={className} />;
}
