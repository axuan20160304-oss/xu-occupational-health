import { GbzExplorer } from "@/components/standards/gbz-explorer";
import { StandardsTabs } from "@/components/standards/standards-tabs";
import { ContentCard } from "@/components/content/content-card";
import { SectionTitle } from "@/components/ui/section-title";
import { gbzHazards } from "@/data/gbz188";
import { loadStandardsSnapshot } from "@/lib/standards-store";
import { getContentList } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function StandardsPage() {
  const [snapshot, laws] = await Promise.all([
    loadStandardsSnapshot(),
    getContentList("laws"),
  ]);
  const hazards = snapshot?.hazards ?? gbzHazards;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Standards & Regulations"
        title="GBZ标准与法规"
        description="职业健康标准、法律法规全文，支持PDF在线预览与下载。GBZ 188速查表按危害因素快速检索。"
      />

      <StandardsTabs
        docsContent={
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              共 {laws.length} 篇标准法规文档
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {laws.map((item) => (
                <ContentCard key={item.slug} item={item} basePath="/standards" />
              ))}
            </div>
            {laws.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
                暂无标准法规文档，可通过 OpenClaw 自动添加。
              </div>
            )}
          </div>
        }
        gbzContent={
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--text-muted)]">
              <p>
                当前展示 {hazards.length} 条标准项。
                {snapshot
                  ? ` 数据来源：${snapshot.source}，最近更新：${new Date(snapshot.updatedAt).toLocaleString("zh-CN")}`
                  : " 当前使用内置默认数据。"}
              </p>
            </div>
            <GbzExplorer hazards={hazards} />
          </div>
        }
      />
    </div>
  );
}
