import { Hero } from "@/components/home/hero";
import { QuickAccessGrid } from "@/components/home/quick-access-grid";
import { LatestFeed } from "@/components/home/latest-feed";
import { getContentList } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allLaws = await getContentList("laws");
  const allArticles = await getContentList("articles");

  const latestLaws = allLaws.slice(0, 4);
  const latestArticles = allArticles.slice(0, 4);

  const stats = [
    { label: "法规条目", value: allLaws.length },
    { label: "专业文章", value: allArticles.length },
    { label: "API端点", value: 6 },
    { label: "支持媒体类型", value: 5 },
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
          数据维护说明
        </h2>
        <ul className="list-inside space-y-1">
          <li>• 法规与文章以 MDX 格式存储，支持 Markdown 与自定义组件</li>
          <li>• 支持 POST /api/smart-push 智能识别内容类型并自动分发</li>
          <li>• 支持 POST /api/webhook/openclaw 对接 OpenClaw Telegram 机器人</li>
          <li>• GBZ 标准数据通过 JSON 结构化存储，支持按危害因素检索</li>
          <li>• 所有内容变更均通过 Git 版本控制，确保可追溯</li>
        </ul>
      </section>
    </main>
  );
}
