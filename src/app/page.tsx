import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { QuickAccessGrid } from "@/components/home/quick-access-grid";
import { LatestFeed } from "@/components/home/latest-feed";
import { getContentList } from "@/lib/content";
import { getImageList, getPptList } from "@/lib/media-store";

export const dynamic = "force-dynamic";

const statMeta = [
  { label: "标准法规", href: "/standards", icon: "📋" },
  { label: "专业文章", href: "/articles", icon: "📝" },
  { label: "图片资料", href: "/images", icon: "🖼️" },
  { label: "PPT课件", href: "/ppts", icon: "📊" },
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

  const counts = [allLaws.length, allArticles.length, allImages.length, allPpts.length];
  const totalCount = counts.reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <Hero />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statMeta.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className="card-shadow group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center hover:border-[var(--brand)]"
          >
            <p className="text-3xl font-bold text-gradient">{counts[i]}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)] group-hover:text-[var(--brand)]">{s.label}</p>
          </Link>
        ))}
      </section>

      <QuickAccessGrid />
      <LatestFeed laws={latestLaws} articles={latestArticles} />

      {/* Platform info */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] sm:flex">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              平台说明
            </h2>
            <div className="mt-3 grid gap-2 text-sm leading-relaxed text-[var(--text-muted)] sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--brand)]">•</span>
                <span>标准法规与文章由 <strong className="text-[var(--text-secondary)]">OpenClaw AI</strong> 联网搜索、整合并自动推送</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--brand)]">•</span>
                <span>图片与PPT课件由 <strong className="text-[var(--text-secondary)]">NotebookLM</strong> 生成后上传</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--brand)]">•</span>
                <span>标准法规支持 PDF 原文在线预览与下载</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--brand)]">•</span>
                <span>GBZ 188 速查表按危害因素快速检索检查项目与禁忌证</span>
              </div>
            </div>
            {totalCount > 0 && (
              <p className="mt-4 text-xs text-[var(--text-subtle)]">
                当前共收录 {totalCount} 条内容 · 所有变更均通过 Git 版本控制
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
