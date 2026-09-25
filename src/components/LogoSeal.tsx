'use client';

type Props = {
  src?: string | null;
  className?: string;
};

export default function LogoSeal({ src, className = 'h-10 w-10' }: Props) {
  // Logo resmi Bawaslos SMK Negeri 64 Jakarta (lingkaran elang + kotak suara)
  const imageSrc = src && src.trim() !== '' ? src : '/logo.png';

  return (
    <span
      className={`inline-block aspect-square overflow-hidden rounded-full ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt="Seal Bawaslos"
        className="h-full w-full object-cover object-center"
      />
    </span>
  );
}
