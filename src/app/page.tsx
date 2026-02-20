import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { QuickAccessGrid } from "@/components/home/quick-access-grid";
import { LatestFeed } from "@/components/home/latest-feed";
import { getContentList } from "@/lib/content";
import { getImageList, getPptList } from "@/lib/media-store";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

function getStandardsCatalogCount(): number {
  try {
    const file = join(process.cwd(), "content", "standards", "standards-catalog.json");
    const data = JSON.parse(readFileSync(file, "utf8"));
    return data.stats?.total || data.standards?.length || 0;
  } catch {
    return 0;
  }
}

const statMeta = [
  { label: "标准法规", href: "/standards" },
  { label: "专业文章", href: "/articles" },
  { label: "图片资料", href: "/images" },
  { label: "PPT课件", href: "/ppts" },
];

export default async function Home() {
  const [allLaws, allArticles, allImages, allPpts] = await Promise.all([
    getContentList("laws"),
    getContentList("articles"),
    getImageList(),
    getPptList(),
  ]);

  const latestLaws = allLaws.slice(0, 4);
  const latestArticles = allArticles.slice(0, 4);

  const standardsCount = getStandardsCatalogCount();
  const counts = [standardsCount || allLaws.length, allArticles.length, allImages.length, allPpts.length];
  const totalCount = counts.reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <Hero />

      {/* Stats strip */}
      <section className="animate-fade-up-delay-1 grid grid-cols-2 gap-3 md:grid-cols-4">
        {statMeta.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className="card card-interactive group flex flex-col items-center p-4"
          >
            <span className="text-[28px] font-bold leading-none text-gradient">{counts[i]}</span>
            <span className="mt-1.5 text-[12px] font-medium text-[var(--text-muted)] group-hover:text-[var(--brand)]">{s.label}</span>
          </Link>
        ))}
      </section>

      <QuickAccessGrid />
      <LatestFeed laws={latestLaws} articles={latestArticles} />

      {/* Platform info */}
      <section className="animate-fade-up-delay-3 card overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            平台说明
          </h2>
        </div>
        <div className="grid gap-0 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {[
            { text: "标准法规与文章由 OpenClaw AI 联网搜索、整合并自动推送", highlight: "OpenClaw AI" },
            { text: "图片与PPT课件由 NotebookLM 生成后上传", highlight: "NotebookLM" },
            { text: "标准法规支持 PDF 原文在线预览与下载", highlight: "PDF" },
            { text: "GBZ 188 速查表按危害因素快速检索检查项目与禁忌证", highlight: "GBZ 188" },
          ].map((item) => (
            <div key={item.highlight} className="flex items-start gap-3 px-6 py-4">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)]">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--brand)"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>
              </span>
              <span className="text-[13px] leading-[1.6] text-[var(--text-muted)]">{item.text}</span>
            </div>
          ))}
        </div>
        {totalCount > 0 && (
          <div className="border-t border-[var(--border)] px-6 py-3">
            <p className="text-[11px] text-[var(--text-subtle)]">
              当前共收录 {totalCount} 条内容 · 所有变更均通过 Git 版本控制
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
