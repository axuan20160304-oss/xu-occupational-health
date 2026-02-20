import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentList } from "@/components/content/attachment-list";
import { MdxContent } from "@/components/content/mdx-content";
import { getContentBySlug } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface StandardDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StandardDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getContentBySlug("laws", slug);

  if (!doc) {
    return {
      title: "标准未找到",
      description: "请求的标准法规内容不存在或已删除。",
    };
  }

  return {
    title: `${doc.title} | 标准法规`,
    description: doc.summary,
  };
}

export default async function StandardDetailPage({ params }: StandardDetailPageProps) {
  const { slug } = await params;
  const doc = await getContentBySlug("laws", slug);

  if (!doc) {
    notFound();
  }

  const hasPdf = doc.attachments.some((a) => a.type === "pdf");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/standards" className="text-sm text-[var(--brand)] hover:underline">
        ← 返回标准法规
      </Link>

      <header className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xs text-[var(--text-subtle)]">{formatDate(doc.date)}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{doc.title}</h1>
        <p className="mt-3 leading-7 text-[var(--text-muted)]">{doc.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--brand)]">
            {doc.category}
          </span>
          {doc.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* PDF Preview */}
      {hasPdf ? (
        <div className="mt-6 space-y-3">
          {doc.attachments
            .filter((a) => a.type === "pdf")
            .map((a) => (
              <div key={a.url} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{a.name}</p>
                  <a
                    href={a.url}
                    download
                    className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                  >
                    下载 PDF
                  </a>
                </div>
                <iframe
                  src={a.url}
                  className="h-[600px] w-full"
                  title={a.name}
                />
              </div>
            ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-alt)]">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[var(--text-muted)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">PDF 原文暂未上传</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            管理员可在后台上传 PDF 原文，上传后将在此处提供在线预览与下载
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <MdxContent source={doc.content} />
        <AttachmentList attachments={doc.attachments.filter((a) => a.type !== "pdf")} />
      </div>
    </div>
  );
}
