"use client";

import { useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/lib/media-store";
import { formatDate } from "@/lib/utils";

interface ImageGalleryProps {
  images: MediaItem[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [preview, setPreview] = useState<MediaItem | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <article
            key={img.id}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_18px_44px_-26px_var(--brand-soft)]"
            onClick={() => setPreview(img)}
          >
            <div className="relative aspect-[4/3] w-full bg-[var(--surface-alt)]">
              <Image
                src={`/uploads/images/${img.filename}`}
                alt={img.title}
                fill
                className="object-cover transition group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                {img.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                {img.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {img.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-subtle)]">
                {formatDate(img.date)}
                {img.source ? ` · ${img.source}` : ""}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Lightbox Preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{preview.title}</h3>
                <p className="text-xs text-[var(--text-muted)]">{preview.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/uploads/images/${preview.filename}`}
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
            <div className="relative flex items-center justify-center bg-black/5 p-4" style={{ maxHeight: "calc(90vh - 60px)" }}>
              <Image
                src={`/uploads/images/${preview.filename}`}
                alt={preview.title}
                width={1200}
                height={800}
                className="max-h-[calc(90vh-100px)] w-auto object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
