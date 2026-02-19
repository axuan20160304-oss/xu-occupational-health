import Link from "next/link";
import type { ContentMeta } from "@/lib/content";
import { formatDate } from "@/lib/utils";

interface ContentCardProps {
  item: ContentMeta;
  basePath: "/articles" | "/laws";
}

export function ContentCard({ item, basePath }: ContentCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_18px_44px_-26px_var(--brand-soft)]">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-[var(--brand)]">
          {item.category}
        </span>
        <span className="text-[var(--text-subtle)]">{formatDate(item.date)}</span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-[var(--text-primary)]">
        <Link href={`${basePath}/${item.slug}`} className="hover:text-[var(--brand)]">
          {item.title}
        </Link>
      </h3>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
        {item.summary}
      </p>

      {item.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
