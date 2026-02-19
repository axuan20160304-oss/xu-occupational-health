import { Hero } from "@/components/home/hero";
import { QuickAccessGrid } from "@/components/home/quick-access-grid";
import { LatestFeed } from "@/components/home/latest-feed";
import { getContentList } from "@/lib/content";
import { getImageList, getPptList } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [allLaws, allArticles, allImages, allPpts] = await Promise.all([
    getContentList("laws"),
    getContentList("articles"),
    getImageList(),
    getPptList(),
  ]);

  const latestLaws = allLaws.slice(0, 4);
  const latestArticles = allArticles.slice(0, 4);

  const stats = [
    { label: "标准法规", value: allLaws.length },
    { label: "专业文章", value: allArticles.length },
    { label: "图片资料", value: allImages.length },
    { label: "PPT课件", value: allPpts.length },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
      <Hero />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center"
          >
            <p className="text-3xl font-bold text-[var(--brand)]">{s.value}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{s.label}</p>
          </div>
        ))}
      </section>

      <QuickAccessGrid />
      <LatestFeed laws={latestLaws} articles={latestArticles} />

      {/* Maintenance info */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-sm leading-7 text-[var(--text-muted)]">
        <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">
          内容来源说明
        </h2>
        <ul className="list-inside space-y-1">
          <li>• 标准法规与文章由 OpenClaw AI 联网搜索、整合并自动推送</li>
          <li>• 图片与PPT课件由 OpenClaw 调取 NotebookLM 生成后上传</li>
          <li>• 标准法规支持 PDF 原文在线预览与下载</li>
          <li>• GBZ 188 速查表按危害因素快速检索检查项目与禁忌证</li>
          <li>• 所有内容变更均通过 Git 版本控制，确保可追溯</li>
        </ul>
      </section>
    </main>
  );
}
