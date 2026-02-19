"use client";

import { useMemo, useState } from "react";
import { gbzCategories, type GbzHazard } from "@/data/gbz188";

interface GbzExplorerProps {
  hazards: GbzHazard[];
}

export function GbzExplorer({ hazards }: GbzExplorerProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string>("全部");

  const filtered = useMemo(() => {
    return hazards.filter((hazard) => {
      const byCategory = category === "全部" || hazard.category === category;
      const byKeyword =
        keyword.trim() === "" ||
        hazard.name.includes(keyword) ||
        hazard.code.includes(keyword) ||
        hazard.targetDiseases.some((disease) => disease.includes(keyword));

      return byCategory && byKeyword;
    });
  }, [category, hazards, keyword]);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_220px]">
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="按危害因素、编码、目标疾病搜索..."
          className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
        >
          <option value="全部">全部分类</option>
          {gbzCategories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.map((hazard) => (
          <article
            key={hazard.code}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--brand)]">
                第 {hazard.code} 节
              </span>
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                {hazard.category}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{hazard.name}</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <section>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">重点检查项目</h4>
                <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
                  {hazard.checks.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">职业禁忌证提示</h4>
                <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
                  {hazard.contraindications.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
              <p>
                <span className="font-medium text-[var(--text-primary)]">检查周期：</span>
                {hazard.cycle}
              </p>
              <p className="mt-1">
                <span className="font-medium text-[var(--text-primary)]">目标疾病：</span>
                {hazard.targetDiseases.join("、")}
              </p>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
            暂未匹配到结果，请调整关键词或分类。
          </div>
        ) : null}
      </div>
    </section>
  );
}
