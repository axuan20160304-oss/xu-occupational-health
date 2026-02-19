"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
      aria-label="切换主题"
    >
      <Moon size={16} className={isDark ? "hidden" : undefined} />
      <Sun size={16} className={isDark ? undefined : "hidden"} />
    </button>
  );
}
