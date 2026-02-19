"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("用户名或密码错误");
    } else if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] text-xl font-bold text-white" style={{ background: "var(--gradient-brand)" }}>
            职
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">管理员登录</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">登录后可管理网站内容</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-sm)] px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[12px] text-[var(--text-subtle)]">或</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <button
          onClick={() => signIn("wechat", { callbackUrl })}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[#07C160] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#06AD56]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.253-1.734c0-3.407 3.167-6.168 7.07-6.168.34 0 .67.027.992.07C16.19 4.672 12.8 2.188 8.691 2.188zm-2.6 4.408c.56 0 1.016.455 1.016 1.016 0 .56-.456 1.016-1.017 1.016-.56 0-1.016-.456-1.016-1.016 0-.56.456-1.016 1.016-1.016zm5.22 0c.56 0 1.016.455 1.016 1.016 0 .56-.456 1.016-1.016 1.016-.56 0-1.016-.456-1.016-1.016 0-.56.456-1.016 1.016-1.016zM16.318 9.58c-3.404 0-6.162 2.36-6.162 5.27 0 2.912 2.758 5.272 6.162 5.272.676 0 1.326-.1 1.94-.27a.72.72 0 0 1 .59.08l1.302.762a.272.272 0 0 0 .14.046c.133 0 .244-.11.244-.245 0-.06-.024-.12-.04-.178l-.266-1.012a.49.49 0 0 1 .177-.553C21.86 17.694 22.48 16.09 22.48 14.85c0-2.91-2.758-5.27-6.162-5.27zm-2.2 3.37c.467 0 .847.38.847.847a.847.847 0 0 1-.847.847.847.847 0 0 1-.847-.847c0-.467.38-.847.847-.847zm4.4 0c.467 0 .847.38.847.847a.847.847 0 0 1-.847.847.847.847 0 0 1-.847-.847c0-.467.38-.847.847-.847z"/>
          </svg>
          微信扫码登录
        </button>

        <p className="mt-3 text-center text-[11px] text-[var(--text-subtle)]">
          管理员微信扫码后自动获得管理权限
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
