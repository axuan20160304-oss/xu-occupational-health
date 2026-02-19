import type { ReactNode } from "react";
import Link from "next/link";
import { quickAccessCards } from "@/data/navigation";

const icons: Record<string, ReactNode> = {
  "/standards": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h4"/></svg>
  ),
  "/articles": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ),
  "/images": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
  ),
  "/ppts": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  ),
};

export function QuickAccessGrid() {
  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickAccessCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card-shadow group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:-translate-y-0.5 hover:border-[var(--brand)]"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-white">
              {icons[card.href]}
            </div>
            <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--accent)]">
              {card.badge}
            </span>
            <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              {card.title}
            </h3>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">{card.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] opacity-0 group-hover:opacity-100">
              查看详情
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
