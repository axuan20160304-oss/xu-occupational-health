import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface)]/90">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-[var(--text-muted)] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} 徐广军 · 职业病专业网站。为职业健康从业人员提供高质量信息支持。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link className="hover:text-[var(--brand)]" href="/laws">
              法律法规
            </Link>
            <Link className="hover:text-[var(--brand)]" href="/articles">
              专业文章
            </Link>
            <Link className="hover:text-[var(--brand)]" href="/standards">
              GBZ速查
            </Link>
            <Link className="hover:text-[var(--brand)]" href="/resources">
              工具资源
            </Link>
          </div>
        </div>
        <p className="text-xs text-[var(--text-subtle)]">
          内容由人工审核与 API 自动同步共同维护。临床决策请结合最新官方规范与本机构制度执行。
        </p>
      </div>
    </footer>
  );
}
