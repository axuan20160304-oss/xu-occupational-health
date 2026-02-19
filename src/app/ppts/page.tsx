import { SectionTitle } from "@/components/ui/section-title";
import { PptList } from "@/components/media/ppt-list";
import { getPptList } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function PptsPage() {
  const ppts = await getPptList();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="PPT Library"
        title="PPT课件库"
        description="职业健康培训课件与演示文稿，支持在线预览与下载。由 NotebookLM 与 OpenClaw 协同生成。"
      />

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        共 {ppts.length} 个课件
      </p>

      <PptList ppts={ppts} />

      {ppts.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
          暂无PPT课件，可通过 OpenClaw 从 NotebookLM 生成并上传。
        </div>
      )}
    </div>
  );
}
