import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { tally, getScoreboardState } from '@/lib/queries';

export const dynamic = 'force-dynamic';

// Ekspor hasil pemilihan (admin only). ?format=csv | json
// Isi disamakan dengan tampilan Scoreboard Arena: total suara + per paslon (No, nama, suara, persen).
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 });
  }
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'csv').toLowerCase();
  const state = await getScoreboardState();
  const rows = await tally();
  const total = rows.reduce((s, r) => s + r.votes, 0) || 1;

  // Susun data agregat (sama seperti web: share dari total suara)
  const data = rows.map((r) => ({
    number: r.number,
    chair_name: r.chair_name,
    vice_name: r.vice_name,
    votes: r.votes,
    percent: Math.round((r.votes / total) * 100),
  }));

  if (format === 'json') {
    const payload = {
      total_suara: total,
      diumumkan: `${state.revealed}/${state.total}`,
      diekspor_pada: new Date().toISOString(),
      paslon: data,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="bawaslos-hasil.json"',
      },
    });
  }

  // CSV: baris summary + per paslon (cocok dengan kartu arena)
  const header = 'no_urut,ketua,wakil,suara,persen\n';
  const body = data
    .map((d) =>
      [
        d.number,
        `"${d.chair_name.replace(/"/g, '""')}"`,
        `"${d.vice_name.replace(/"/g, '""')}"`,
        d.votes,
        `${d.percent}%`,
      ].join(',')
    )
    .join('\n');
  const csv = [
    `# Total Suara: ${total}`,
    `# Diumumkan: ${state.revealed}/${state.total}`,
    header + body + '\n',
  ].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bawaslos-hasil.csv"',
    },
  });
}
