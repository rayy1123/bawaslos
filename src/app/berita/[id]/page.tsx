import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNews } from '@/lib/queries';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BeritaDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const news = getNews(id);
  if (!news || !news.published) notFound();

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="overflow-hidden rounded-2xl border border-[#0b1f4b]/12 bg-[#fbfaf6]">
          {news.cover_url && (
            <div className="aspect-[16/9] w-full overflow-hidden bg-[#0b1f4b]/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={news.cover_url} alt={news.title} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="badge-terkini">Terkini</span>
              {news.is_new ? <span className="badge-new">Baru</span> : null}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b0892f]">
              {formatDate(news.created_at)}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-[#0b1f4b] sm:text-4xl">
              {news.title}
            </h1>
            <hr className="rule-double my-6" />
            <div className="whitespace-pre-line text-[15px] leading-relaxed text-[#2c3e63]">
              {news.body}
            </div>
          </div>
        </article>

        <div className="mt-8 flex items-center justify-between">
          <Link href="/berita" className="text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
            ← Semua Berita
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
            Beranda
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
