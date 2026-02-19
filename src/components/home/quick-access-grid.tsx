import Link from "next/link";
import { quickAccessCards } from "@/data/navigation";

export function QuickAccessGrid() {
  return (
    <section>
      <div className="grid gap-4 md:grid-cols-2">
        {quickAccessCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_20px_50px_-30px_var(--brand-soft)]"
          >
            <span className="inline-flex rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--brand)]">
              {card.badge}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
