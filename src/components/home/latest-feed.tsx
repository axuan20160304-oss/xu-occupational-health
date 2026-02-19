import Link from "next/link";
import { ContentCard } from "@/components/content/content-card";
import type { ContentMeta } from "@/lib/content";
import { SectionTitle } from "@/components/ui/section-title";

interface LatestFeedProps {
  laws: ContentMeta[];
  articles: ContentMeta[];
}

export function LatestFeed({ laws, articles }: LatestFeedProps) {
  return (
    <div className="grid gap-10 xl:grid-cols-2">
      <section>
        <SectionTitle
          eyebrow="法规动态"
          title="最新法律法规"
          description="聚合近期更新的法规、标准与监管要点。"
          action={
            <Link
              href="/laws"
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              查看全部
            </Link>
          }
        />
        <div className="grid gap-4">
          {laws.map((item) => (
            <ContentCard key={item.slug} item={item} basePath="/laws" />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="实务沉淀"
          title="最新专业文章"
          description="覆盖诊疗流程、案例复盘、岗位风险管理与规范解读。"
          action={
            <Link
              href="/articles"
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              查看全部
            </Link>
          }
        />
        <div className="grid gap-4">
          {articles.map((item) => (
            <ContentCard key={item.slug} item={item} basePath="/articles" />
          ))}
        </div>
      </section>
    </div>
  );
}
