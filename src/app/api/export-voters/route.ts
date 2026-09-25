import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { listVoters, getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// Endpoint ekspor daftar token pemilih ke format Excel (CSV dengan UTF-8 BOM)
// Dilengkapi proteksi admin.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'used' | 'unused';
  const { voters, total, used, unused } = await listVoters({ filter, limit: 10000 });
  const settings = await getSettings();

  // Header informasi rekap
  const lines: string[] = [
    `# =========================================================================`,
    `# DAFTAR TOKEN PEMILIH (DPT) - ${settings.org_name.toUpperCase()}`,
    `# ${settings.org_subtitle}`,
    `# Total DPT: ${total} Pemilih | Sudah Memilih: ${used} | Belum Memilih: ${unused}`,
    `# Dicetak / Diekspor pada: ${new Date().toLocaleString('id-ID')}`,
    `# PENTING: Jaga kerahasiaan daftar ini sebelum dibagikan ke pemilih.`,
    `# =========================================================================`,
    `No,Nomor Pemilih,Kode Token,Status,Waktu Mencoblos,Bilik Suara`,
  ];

  for (let i = 0; i < voters.length; i++) {
    const v = voters[i];
    const status = v.is_used === 1 ? 'Sudah Memilih' : 'Belum Memilih';
    const usedAt = v.used_at ? `"${v.used_at}"` : '';
    const booth = v.used_booth ? `Bilik ${v.used_booth}` : '';
    lines.push(`${i + 1},"${v.name}",${v.token},"${status}",${usedAt},"${booth}"`);
  }

  // Sertakan UTF-8 BOM (\uFEFF) agar Microsoft Excel di Windows otomatis membaca aksen & pemisah kolom dengan tepat
  const csvContent = '\uFEFF' + lines.join('\r\n') + '\r\n';

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bawaslos-token-pemilih-${total > 0 ? voters[0]?.voter_no + '-' + voters[voters.length - 1]?.voter_no : 'dpt'}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
