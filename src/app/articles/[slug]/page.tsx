import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentList } from "@/components/content/attachment-list";
import { MdxContent } from "@/components/content/mdx-content";
import { getContentBySlug } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ArticleDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getContentBySlug("articles", slug);

  if (!article) {
    return {
      title: "文章未找到",
      description: "请求的文章不存在或已删除。",
    };
  }

  return {
    title: `${article.title} | 专业文章`,
    description: article.summary,
  };
}

export default async function ArticleDetailPage({
  params,
}: ArticleDetailPageProps) {
  const { slug } = await params;
  const article = await getContentBySlug("articles", slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/articles" className="text-sm text-[var(--brand)] hover:underline">
        ← 返回文章列表
      </Link>

      <header className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xs text-[var(--text-subtle)]">{formatDate(article.date)}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{article.title}</h1>
        <p className="mt-3 leading-7 text-[var(--text-muted)]">{article.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--brand)]">
            {article.category}
          </span>
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <MdxContent source={article.content} />
        <AttachmentList attachments={article.attachments} />
      </div>
    </div>
  );
}
