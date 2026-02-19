import Link from "next/link";
import { ContentCard } from "@/components/content/content-card";
import type { ContentMeta } from "@/lib/content";
import { SectionTitle } from "@/components/ui/section-title";

interface LatestFeedProps {
  laws: ContentMeta[];
  articles: ContentMeta[];
}

function EmptyPlaceholder({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="card card-interactive flex flex-col items-center justify-center p-8 text-center"
      style={{ borderStyle: "dashed" }}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-alt)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <p className="text-[13px] font-medium text-[var(--text-muted)]">{title}</p>
      <p className="mt-1 text-[11px] text-[var(--text-subtle)]">{description}</p>
    </Link>
  );
}

export function LatestFeed({ laws, articles }: LatestFeedProps) {
  const hasContent = laws.length > 0 || articles.length > 0;

  if (!hasContent) {
    return (
      <section className="card relative overflow-hidden p-10 text-center">
        {/* Dot grid bg */}
        <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30" />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">内容即将上线</h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-[1.7] text-[var(--text-muted)]">
            平台已就绪，OpenClaw AI 正在自动搜索整合职业健康领域的标准法规与专业文章。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="pill bg-[var(--success-soft)] text-[var(--success)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              </span>
              系统运行中
            </span>
            <span className="pill bg-[var(--brand-soft)] text-[var(--brand)]">
              OpenClaw 已连接
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-10 xl:grid-cols-2">
      <section>
        <SectionTitle
          eyebrow="法规动态"
          title="最新法律法规"
          description="聚合近期更新的法规、标准与监管要点。"
          action={
            laws.length > 0 ? (
              <Link
                href="/laws"
                className="text-sm font-medium text-[var(--brand)] hover:underline"
              >
                查看全部
              </Link>
            ) : undefined
          }
        />
        {laws.length > 0 ? (
          <div className="grid gap-4">
            {laws.map((item) => (
              <ContentCard key={item.slug} item={item} basePath="/laws" />
            ))}
          </div>
        ) : (
          <EmptyPlaceholder title="暂无法规" description="通过 OpenClaw 添加标准法规" href="/standards" />
        )}
      </section>

      <section>
        <SectionTitle
          eyebrow="实务沉淀"
          title="最新专业文章"
          description="覆盖诊疗流程、案例复盘、岗位风险管理与规范解读。"
          action={
            articles.length > 0 ? (
              <Link
                href="/articles"
                className="text-sm font-medium text-[var(--brand)] hover:underline"
              >
                查看全部
              </Link>
            ) : undefined
          }
        />
        {articles.length > 0 ? (
          <div className="grid gap-4">
            {articles.map((item) => (
              <ContentCard key={item.slug} item={item} basePath="/articles" />
            ))}
          </div>
        ) : (
          <EmptyPlaceholder title="暂无文章" description="通过 OpenClaw 生成专业文章" href="/articles" />
        )}
      </section>
    </div>
  );
}
