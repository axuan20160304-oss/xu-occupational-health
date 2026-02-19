import type { ReactNode } from "react";
import Link from "next/link";
import { quickAccessCards } from "@/data/navigation";

const icons: Record<string, ReactNode> = {
  "/standards": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h4"/></svg>
  ),
  "/articles": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ),
  "/images": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
  ),
  "/ppts": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  ),
};

export function QuickAccessGrid() {
  return (
    <section className="animate-fade-up-delay-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickAccessCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card card-interactive group flex flex-col p-5"
          >
            <div className="mb-3.5 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-soft)] text-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-white">
              {icons[card.href]}
            </div>
            <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              {card.badge}
            </span>
            <h3 className="text-[14px] font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              {card.title}
            </h3>
            <p className="mt-1.5 flex-1 text-[12px] leading-[1.6] text-[var(--text-muted)]">{card.description}</p>
            <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[var(--brand)] opacity-0 group-hover:opacity-100">
              进入
              <svg className="transition-transform group-hover:translate-x-0.5" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
