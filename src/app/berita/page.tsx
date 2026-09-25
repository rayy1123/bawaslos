import Link from 'next/link';
import { listNews } from '@/lib/queries';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

function excerpt(body: string, n = 160): string {
  const t = body.trim();
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t;
}

function formatDate(iso: string): string {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BeritaIndexPage() {
  const news = await listNews(true);
  const featured = news.find((n) => n.featured) ?? null;
  const rest = featured ? news.filter((n) => n.id !== featured.id) : news;
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <header className="pb-5 text-center">
          <p className="label-official">Portal Berita</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-[#0b1f4b] sm:text-5xl">
            Berita &amp; Pengumuman
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[#2c3e63]">
            Informasi resmi seputar pemilihan Ketua &amp; Wakil Ketua OSIS dari Badan Pengawas Pemilihan.
          </p>
        </header>

        {news.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#0b1f4b]/20 bg-[#fbfaf6] p-8 text-center text-sm text-[#2c3e63]">
            Belum ada berita terpublikasi.
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {featured && (
              <Link
                key={featured.id}
                href={`/berita/${featured.id}`}
                className="group block overflow-hidden rounded-xl border-2 border-[#0b1f4b]/20 bg-[#fbfaf6] transition hover:border-[#b0892f]/50 hover:shadow-md"
              >
                <div className="flex items-center gap-2 px-6 pt-5">
                  <span className="badge-terkini">Terkini</span>
                  {featured.is_new ? <span className="badge-new">Baru</span> : null}
                </div>
                <div className="aspect-[16/9] w-full overflow-hidden bg-[#0b1f4b]/5">
                  {featured.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.cover_url} alt={featured.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-3xl font-bold text-[#0b1f4b]/20">
                      BAWASLOS
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#b0892f]">
                    {formatDate(featured.created_at)}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-[#0b1f4b] group-hover:text-[#b0892f]">
                    {featured.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#2c3e63]">{excerpt(featured.body)}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0b1f4b] group-hover:text-[#b0892f]">
                    Baca selengkapnya →
                  </span>
                </div>
              </Link>
            )}
            {rest.map((n) => (
              <Link
                key={n.id}
                href={`/berita/${n.id}`}
                className="group block overflow-hidden rounded-xl border border-[#0b1f4b]/12 bg-[#fbfaf6] transition hover:border-[#b0892f]/40 hover:shadow-md"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-[#0b1f4b]/5">
                  {n.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.cover_url} alt={n.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-3xl font-bold text-[#0b1f4b]/20">
                      BAWASLOS
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="mb-1 flex items-center gap-2">
                    {n.is_new ? <span className="badge-new">Baru</span> : null}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#b0892f]">
                    {formatDate(n.created_at)}
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-[#0b1f4b] group-hover:text-[#b0892f]">
                    {n.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#2c3e63]">{excerpt(n.body)}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0b1f4b] group-hover:text-[#b0892f]">
                    Baca selengkapnya →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="text-sm font-semibold text-[#0b1f4b] hover:text-[#b0892f]">
            ← Kembali ke Beranda
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
