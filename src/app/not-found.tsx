import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-[var(--brand)]">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">页面未找到</h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--text-muted)]">
        你访问的页面可能已被移除或暂未发布。可返回首页或查看法规、文章列表。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white"
        >
          返回首页
        </Link>
        <Link
          href="/laws"
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)]"
        >
          查看法规
        </Link>
      </div>
    </div>
  );
}
