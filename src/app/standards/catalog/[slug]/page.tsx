import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

interface StandardEntry {
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

function loadCatalog(): { standards: StandardEntry[] } {
  try {
    const file = join(process.cwd(), "content", "standards", "standards-catalog.json");
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { standards: [] };
  }
}

function loadPdfAvailability(): Record<string, string> {
  try {
    const file = join(process.cwd(), "content", "standards", "pdf-availability.json");
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function loadDocAvailability(): Record<string, string> {
  try {
    const file = join(process.cwd(), "content", "standards", "doc-availability.json");
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function findStandard(slug: string): StandardEntry | null {
  const { standards } = loadCatalog();
  return standards.find((s) => s.slug === slug) ?? null;
}

function findRelatedStandards(current: StandardEntry): StandardEntry[] {
  const { standards } = loadCatalog();
  // Extract the standard number without year, e.g. "GBZ 1" from "GBZ 1-2010"
  // or "GBZ 2.1" from "GBZ 2.1-2019", or "GBZ/T 300.1" from "GBZ/T 300.1-2017"
  const codeBase = current.code.replace(/-\d{4}$/, "").trim();
  return standards
    .filter((s) => {
      if (s.id === current.id) return false;
      const otherBase = s.code.replace(/-\d{4}$/, "").trim();
      return otherBase === codeBase;
    })
    .sort((a, b) => b.year - a.year)
    .slice(0, 5);
}

function generateSummary(s: StandardEntry): string {
  const statusText = s.status === "现行" ? "现行有效" : "已废止";
  const prefix = s.code.split(/[\s-]/)[0];
  let typeDesc = "职业卫生标准";
  if (prefix === "GBZ" || prefix === "GBZ/T") typeDesc = "国家职业卫生标准";
  else if (prefix === "WS" || prefix === "WS/T") typeDesc = "卫生行业标准";
  else if (prefix === "GB") typeDesc = "国家标准";
  else if (prefix === "AQ") typeDesc = "安全生产行业标准";

  const catMap: Record<string, string> = {
    "职业病诊断": "规定了相关职业病的诊断原则、诊断标准和处理措施，适用于职业病诊断机构和临床医师参考使用。",
    "接触限值": "规定了工作场所有害因素的职业接触限值，为职业卫生评价与工程防护提供科学依据。",
    "放射卫生防护": "规定了放射工作场所及放射工作人员的防护要求和管理规范。",
    "职业健康监护": "规定了接触职业病危害因素劳动者的健康检查项目、周期和禁忌证。",
    "工作场所检测方法": "规定了工作场所空气中有害物质的采样和检测分析方法。",
    "技术规范与导则": "提供了职业卫生相关工作的技术指导和操作规范。",
    "工程防护与设计": "规定了工业企业在建设和设计中应遵循的职业卫生防护要求。",
    "个体防护": "规定了劳动者使用的个体防护装备的技术要求和选用规范。",
    "职业卫生管理": "规定了用人单位职业卫生管理的基本要求和规范。",
  };

  const catDesc = catMap[s.category] || "为职业卫生工作提供技术依据和规范指导。";

  return `${s.fullTitle} 是${statusText}的${typeDesc}，发布于 ${s.year} 年，属于"${s.category}"类别。${catDesc}`;
}

interface CatalogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CatalogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const std = findStandard(slug);
  if (!std) return { title: "标准未找到" };
  return {
    title: `${std.fullTitle} | 标准法规`,
    description: generateSummary(std),
  };
}

export default async function CatalogDetailPage({ params }: CatalogDetailPageProps) {
  const { slug } = await params;
  const std = findStandard(slug);
  if (!std) notFound();

  const summary = generateSummary(std);
  const related = findRelatedStandards(std);
  const pdfMap = loadPdfAvailability();
  const docMap = loadDocAvailability();
  const pdfBaseUrl = process.env.PDF_BASE_URL || "https://philosophy-lake-cutting-bio.trycloudflare.com";

  const hasPdf = !!pdfMap[std.slug];
  const hasDoc = !!docMap[std.slug];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/standards" className="text-sm text-[var(--brand)] hover:underline">
        ← 返回标准法规
      </Link>

      {/* Header */}
      <header className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
          <span className="font-mono font-semibold text-[var(--brand)]">{std.code}</span>
          <span>·</span>
          <span>{std.year} 年</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
          {std.fullTitle}
        </h1>
        <p className="mt-3 leading-7 text-[var(--text-muted)]">{summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--surface-alt)] px-2.5 py-1 text-xs text-[var(--brand)]">
            {std.category}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              std.status === "现行"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {std.status}
          </span>
        </div>
      </header>

      {/* Standard Info Card */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">标准信息</p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {[
            { label: "标准编号", value: std.code },
            { label: "标准名称", value: std.title },
            { label: "完整标题", value: std.fullTitle },
            { label: "发布年份", value: String(std.year) },
            { label: "所属分类", value: std.category },
            { label: "当前状态", value: std.status },
          ].map((row) => (
            <div key={row.label} className="flex px-5 py-3">
              <span className="w-24 shrink-0 text-xs font-medium text-[var(--text-muted)]">{row.label}</span>
              <span className="text-sm text-[var(--text-primary)]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Download Section */}
      {(hasPdf || hasDoc) ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">文件下载</p>
          </div>
          <div className="flex flex-wrap gap-3 p-5">
            {hasPdf && (
              <a
                href={`${pdfBaseUrl}/${encodeURIComponent(pdfMap[std.slug])}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-500/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                下载 PDF 原文
              </a>
            )}
            {hasDoc && (
              <a
                href={`${pdfBaseUrl}/${encodeURIComponent(docMap[std.slug])}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-500/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                下载 Word 文档
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-alt)]">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[var(--text-muted)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">原文暂未收录</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            可通过搜索引擎查找该标准原文
          </p>
          <a
            href={`https://www.so.com/s?q=${encodeURIComponent(std.code + " " + std.title + " filetype:pdf")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)]/10 px-4 py-2 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand)]/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            在线搜索 PDF 原文
          </a>
        </div>
      )}

      {/* Related Standards */}
      {related.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">相关版本</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/standards/catalog/${r.slug}`}
                className="flex items-center justify-between px-5 py-3 transition hover:bg-[var(--surface-alt)]"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs font-semibold text-[var(--brand)]">{r.code}</span>
                  <span className="ml-2 text-sm text-[var(--text-primary)]">{r.title}</span>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.status === "现行"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {r.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
