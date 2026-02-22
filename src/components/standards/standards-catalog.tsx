"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface StandardEntry {
  id: number;
  code: string;
  title: string;
  fullTitle: string;
  year: number;
  status: string;
  category: string;
  slug: string;
  pdfFilename: string;
}

interface StandardsCatalogProps {
  standards: StandardEntry[];
  categories: string[];
  pdfMap?: Record<string, string>;
  docMap?: Record<string, string>;
  pdfBaseUrl?: string;
}

export function StandardsCatalog({ standards, categories, pdfMap = {}, docMap = {}, pdfBaseUrl = "" }: StandardsCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [statusFilter, setStatusFilter] = useState<"全部" | "现行" | "废止">("全部");
  const [downloadFilter, setDownloadFilter] = useState<"全部" | "可下载" | "无文件">("全部");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const downloadableCount = useMemo(() => standards.filter(s => pdfMap[s.slug] || docMap[s.slug]).length, [standards, pdfMap, docMap]);

  const filtered = useMemo(() => {
    let result = standards;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          (s.code || "").toLowerCase().includes(q) ||
          (s.title || "").toLowerCase().includes(q) ||
          (s.fullTitle || "").toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "全部") {
      result = result.filter((s) => s.category === selectedCategory);
    }
    if (statusFilter !== "全部") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (downloadFilter === "可下载") {
      result = result.filter((s) => pdfMap[s.slug] || docMap[s.slug]);
    } else if (downloadFilter === "无文件") {
      result = result.filter((s) => !pdfMap[s.slug] && !docMap[s.slug]);
    }
    // Sort: downloadable first, then by code
    result = [...result].sort((a, b) => {
      const aHas = pdfMap[a.slug] || docMap[a.slug] ? 0 : 1;
      const bHas = pdfMap[b.slug] || docMap[b.slug] ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return a.code.localeCompare(b.code, 'zh-CN');
    });
    return result;
  }, [standards, search, selectedCategory, statusFilter, downloadFilter, pdfMap, docMap]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (val: string) => { setSearch(val); setPage(1); if (val.trim()) setSelectedCategory("全部"); };
  const handleCategory = (val: string) => { setSelectedCategory(val); setPage(1); };
  const handleStatus = (val: "全部" | "现行" | "废止") => { setStatusFilter(val); setPage(1); };
  const handleDownload = (val: "全部" | "可下载" | "无文件") => { setDownloadFilter(val); setPage(1); };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "全部": standards.length };
    for (const s of standards) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [standards]);

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索标准编号或名称..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        </div>
        <div className="flex gap-2">
          {(["全部", "现行", "废止"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition",
                statusFilter === s
                  ? s === "现行" ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
                    : s === "废止" ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/30"
                    : "bg-[var(--brand)]/10 text-[var(--brand)] ring-1 ring-[var(--brand)]/30"
                  : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["全部", "可下载", "无文件"] as const).map((d) => (
            <button
              key={d}
              onClick={() => handleDownload(d)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition",
                downloadFilter === d
                  ? d === "可下载" ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
                    : d === "无文件" ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30"
                    : "bg-[var(--brand)]/10 text-[var(--brand)] ring-1 ring-[var(--brand)]/30"
                  : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {d === "可下载" ? `可下载 (${downloadableCount})` : d}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        {["全部", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs transition",
              selectedCategory === cat
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            )}
          >
            {cat}
            <span className="ml-1 opacity-60">({categoryCounts[cat] || 0})</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <p className="text-sm text-[var(--text-muted)]">
        找到 <strong className="text-[var(--text-primary)]">{filtered.length}</strong> 条标准
        {filtered.length !== standards.length && ` / 共 ${standards.length} 条`}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">标准编号</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">标准名称</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--text-muted)] sm:table-cell">年份</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--text-muted)] md:table-cell">分类</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--text-muted)]">状态</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--text-muted)]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paged.map((s) => (
                <tr key={s.id} className="bg-[var(--surface)] transition hover:bg-[var(--surface-alt)]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">
                    <a
                      href={`/standards/catalog/${s.slug}`}
                      className="text-[var(--brand)] hover:underline"
                      title={`查看 ${s.code} 详情`}
                    >
                      {s.code}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">
                    <a
                      href={`/standards/catalog/${s.slug}`}
                      className="hover:text-[var(--brand)] hover:underline transition"
                    >
                      {s.title}
                    </a>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-[var(--text-muted)] sm:table-cell">
                    {s.year}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    <span className="rounded-md bg-[var(--surface-alt)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                      {s.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        s.status === "现行"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-400"
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {pdfMap[s.slug] && (
                        <a
                          href={`${pdfBaseUrl}/${encodeURIComponent(pdfMap[s.slug])}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/20"
                          title={`下载 ${s.code} PDF`}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </a>
                      )}
                      {docMap[s.slug] && (
                        <a
                          href={`${pdfBaseUrl}/${encodeURIComponent(docMap[s.slug])}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-500/20"
                          title={`下载 ${s.code} Word`}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Word
                        </a>
                      )}
                      {!pdfMap[s.slug] && !docMap[s.slug] && (
                        <a
                          href={`https://www.so.com/s?q=${encodeURIComponent(s.code + " " + (s.title || "") + " filetype:pdf")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)]/10 px-2 py-1 text-xs font-medium text-[var(--brand)] transition hover:bg-[var(--brand)]/20"
                          title={`搜索 ${s.code} PDF`}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          搜索
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            第 {page} / {totalPages} 页
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-alt)] disabled:opacity-40"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-alt)] disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {paged.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
          未找到匹配的标准，请调整搜索条件。
        </div>
      )}
    </div>
  );
}
