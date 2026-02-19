"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StandardsTabsProps {
  docsContent: ReactNode;
  gbzContent: ReactNode;
}

const tabs = [
  { key: "docs", label: "标准法规文档" },
  { key: "gbz", label: "GBZ 188 速查" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function StandardsTabs({ docsContent, gbzContent }: StandardsTabsProps) {
  const [active, setActive] = useState<TabKey>("docs");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition",
              active === tab.key
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text-primary)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "docs" ? docsContent : gbzContent}
    </div>
  );
}
