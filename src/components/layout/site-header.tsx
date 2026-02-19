"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavigation } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--surface)/0.88] backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] font-semibold text-white shadow-sm shadow-[color:var(--brand-soft)]">
              职
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium text-[var(--text-primary)]">徐广军 · 职业病专业站</p>
              <p className="text-xs text-[var(--text-muted)]">Occupational Health Intelligence Hub</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {mainNavigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide md:hidden">
          {mainNavigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border border-[var(--border)] text-[var(--text-muted)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
