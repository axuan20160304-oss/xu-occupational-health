import { GbzExplorer } from "@/components/standards/gbz-explorer";
import { SectionTitle } from "@/components/ui/section-title";
import { gbzHazards } from "@/data/gbz188";
import { loadStandardsSnapshot } from "@/lib/standards-store";

export const dynamic = "force-dynamic";

export default async function StandardsPage() {
  const snapshot = await loadStandardsSnapshot();
  const hazards = snapshot?.hazards ?? gbzHazards;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="GBZ 188 Quick Explorer"
        title="GBZ 188-2014 职业健康监护速查"
        description="按危害因素快速检索检查项目、检查周期、职业禁忌证与目标疾病。用于临床与职业健康工作中的快速参考。"
      />

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--text-muted)]">
        <p>
          当前展示 {hazards.length} 条标准项。
          {snapshot
            ? ` 数据来源：${snapshot.source}，最近更新：${new Date(snapshot.updatedAt).toLocaleString("zh-CN")}`
            : " 当前使用内置默认数据，可通过 POST /api/standards 覆盖更新。"}
          涉及具体诊疗决策时，请以最新官方标准原文和机构制度为准。
        </p>
      </div>

      <GbzExplorer hazards={hazards} />
    </div>
  );
}
