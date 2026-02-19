import { SectionTitle } from "@/components/ui/section-title";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="About"
        title="关于徐广军医生"
        description="职业病科医生，长期从事职业健康监护、职业禁忌证判定与职业病防治实务。"
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">专业方向</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--text-muted)]">
            <li>• 职业健康检查与主检结论管理</li>
            <li>• GBZ 188 规范应用与危害因素判定</li>
            <li>• 职业禁忌证复查流程设计</li>
            <li>• 体检系统智能化与自动化工作流</li>
          </ul>

          <h3 className="mt-8 text-lg font-semibold text-[var(--text-primary)]">网站建设目标</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            搭建一个面向职业病专业人员的信息平台，把法规更新、实务经验、标准速查、
            多媒体培训资料集中管理，并通过 API 与 AI 工具协同实现持续更新。
          </p>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">联系方式</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              <li>邮箱：your-email@example.com</li>
              <li>机构：清远市职业病防治相关机构</li>
              <li>服务对象：职业健康从业人员</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">维护策略</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              <li>• 人工审核 + API 自动更新</li>
              <li>• 法规与文章版本留痕</li>
              <li>• 支持 NotebookLM 多媒体内容接入</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
