'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-[#0b1f4b] px-5 py-2 text-xs font-bold text-white hover:bg-[#142c63]"
    >
      🖨️ Cetak / Simpan PDF
    </button>
  );
}
