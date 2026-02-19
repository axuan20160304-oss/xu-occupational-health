import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[var(--text-muted)]">
            © {new Date().getFullYear()} 徐广军 · 职业病专业网站
          </p>
          <div className="flex flex-wrap gap-5">
            {[
              { href: "/standards", label: "标准法规" },
              { href: "/articles", label: "专业文章" },
              { href: "/images", label: "图片资料" },
              { href: "/ppts", label: "PPT课件" },
            ].map((link) => (
              <Link
                key={link.href}
                className="text-[12px] text-[var(--text-subtle)] hover:text-[var(--brand)]"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-subtle)]">
          内容由人工审核与 AI 自动同步共同维护。临床决策请结合最新官方规范与本机构制度执行。
        </p>
      </div>
    </footer>
  );
}
