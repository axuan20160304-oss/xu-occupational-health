"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/media-store";
import { formatDate } from "@/lib/utils";
import { FileType2 } from "lucide-react";

interface PptListProps {
  ppts: MediaItem[];
}

function isPdf(filename: string) {
  return filename.toLowerCase().endsWith(".pdf");
}

export function PptList({ ppts }: PptListProps) {
  const [preview, setPreview] = useState<MediaItem | null>(null);

  if (ppts.length === 0) return null;

  return (
    <>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ppts.map((ppt) => (
          <article
            key={ppt.id}
            className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_18px_44px_-26px_var(--brand-soft)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <FileType2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                  {ppt.title}
                </h3>
                <p className="text-[10px] text-[var(--text-subtle)]">
                  {formatDate(ppt.date)}
                  {ppt.source ? ` · ${ppt.source}` : ""}
                </p>
              </div>
            </div>

            <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
              {ppt.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-1">
              {ppt.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPreview(ppt)}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-alt)] transition"
              >
                预览
              </button>
              <a
                href={`/uploads/ppts/${ppt.filename}`}
                download={ppt.filename}
                className="flex-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-center text-xs font-medium text-white hover:opacity-90 transition"
              >
                下载
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* PPT Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{preview.title}</h3>
                <p className="text-xs text-[var(--text-muted)]">{preview.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/uploads/ppts/${preview.filename}`}
                  download={preview.filename}
                  className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  下载
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-alt)] transition"
                >
                  关闭
                </button>
              </div>
            </div>
            {isPdf(preview.filename) ? (
              <div className="p-4" style={{ height: "calc(90vh - 60px)" }}>
                <iframe
                  src={`/uploads/ppts/${preview.filename}`}
                  className="h-full w-full rounded-lg border-0"
                  title={preview.title}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-8" style={{ minHeight: "400px" }}>
                <div className="text-center space-y-4">
                  <FileType2 size={64} className="mx-auto text-orange-500" />
                  <p className="text-sm text-[var(--text-muted)]">
                    PPT 文件暂不支持在线预览，请下载后查看。
                  </p>
                  <a
                    href={`/uploads/ppts/${preview.filename}`}
                    download={preview.filename}
                    className="inline-block rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
                  >
                    下载 {preview.filename}
                  </a>
                  {preview.thumbnail && (
                    <div className="mt-4">
                      <img
                        src={`/uploads/ppts/${preview.thumbnail}`}
                        alt={`${preview.title} 预览`}
                        className="mx-auto max-h-[400px] rounded-lg border border-[var(--border)]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
