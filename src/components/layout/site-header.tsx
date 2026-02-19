"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { mainNavigation } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="glass sticky top-0 z-40 border-b border-[var(--border)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-[var(--shadow-sm)]"
              style={{ background: "var(--gradient-brand)" }}
            >
              职
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">徐广军 · 职业病专业站</p>
              <p className="text-[10px] text-[var(--text-subtle)]">Occupational Health Hub</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
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
                    "rounded-lg px-3 py-1.5 text-[13px] font-medium",
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
            {session ? (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
              >
                管理后台
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)]"
              >
                登录
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>

        <nav className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide md:hidden">
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
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium",
                  isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)]",
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
