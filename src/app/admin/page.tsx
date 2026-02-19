"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

interface ContentItem {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [laws, setLaws] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [addingStd, setAddingStd] = useState(false);
  const [stdNumber, setStdNumber] = useState("");
  const [stdTitle, setStdTitle] = useState("");
  const [stdSummary, setStdSummary] = useState("");
  const [stdPdfUrl, setStdPdfUrl] = useState("");
  const [stdResult, setStdResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetSlug = useRef<string>("");

  async function handlePdfUpload(slug: string) {
    uploadTargetSlug.current = slug;
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const slug = uploadTargetSlug.current;
    setUploading(slug);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);

      const res = await fetch("/api/admin/upload-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(`PDF 已上传成功！URL: ${data.url}\n下次部署后生效。`);
      } else {
        alert(`上传失败: ${data.message}`);
      }
    } catch {
      alert("上传请求失败");
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAddStandard(e: React.FormEvent) {
    e.preventDefault();
    if (!stdNumber.trim()) return;
    setAddingStd(true);
    setStdResult(null);

    try {
      const res = await fetch("/api/admin/fetch-standard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standardNumber: stdNumber.trim(),
          title: stdTitle.trim() || undefined,
          summary: stdSummary.trim() || undefined,
          pdfUrl: stdPdfUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStdResult({ ok: true, msg: data.message });
        setStdNumber("");
        setStdTitle("");
        setStdSummary("");
        setStdPdfUrl("");
        fetchContent();
      } else {
        setStdResult({ ok: false, msg: data.message });
      }
    } catch {
      setStdResult({ ok: false, msg: "请求失败" });
    }
    setAddingStd(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin");
    }
  }, [status, router]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const [artRes, lawRes] = await Promise.all([
        fetch("/api/admin/list?kind=articles"),
        fetch("/api/admin/list?kind=laws"),
      ]);
      if (artRes.ok) setArticles(await artRes.json());
      if (lawRes.ok) setLaws(await lawRes.json());
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchContent();
    }
  }, [status, fetchContent]);

  async function handleDelete(kind: string, slug: string) {
    if (!confirm(`确定要删除 ${slug} 吗？此操作不可撤销。`)) return;

    setDeleting(`${kind}/${slug}`);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, slug }),
      });
      const data = await res.json();
      if (data.success) {
        if (kind === "articles") setArticles((prev) => prev.filter((a) => a.slug !== slug));
        else setLaws((prev) => prev.filter((l) => l.slug !== slug));
      } else {
        alert(`删除失败: ${data.message}`);
      }
    } catch {
      alert("删除请求失败");
    }
    setDeleting(null);
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-center text-[var(--text-muted)]">加载中...</p>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={onFileSelected}
      />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">管理后台</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            欢迎，{session?.user?.name} · 管理员
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--text-primary)] hover:border-red-400 hover:text-red-500"
        >
          退出登录
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-[var(--brand)]">{articles.length}</div>
          <div className="text-[12px] text-[var(--text-muted)]">专业文章</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-[var(--brand)]">{laws.length}</div>
          <div className="text-[12px] text-[var(--text-muted)]">标准法规</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">在线</div>
          <div className="text-[12px] text-[var(--text-muted)]">系统状态</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">管理员</div>
          <div className="text-[12px] text-[var(--text-muted)]">当前角色</div>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-[var(--text-muted)]">加载内容列表...</p>
      ) : (
        <>
          {/* Articles */}
          <section className="mb-8">
            <h2 className="mb-3 text-[15px] font-semibold text-[var(--text-primary)]">
              专业文章 ({articles.length})
            </h2>
            {articles.length === 0 ? (
              <div className="card p-6 text-center text-[13px] text-[var(--text-muted)]">暂无文章</div>
            ) : (
              <div className="space-y-2">
                {articles.map((item) => (
                  <div key={item.slug} className="card flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14px] font-medium text-[var(--text-primary)]">{item.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{item.date}</span>
                        {item.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded bg-[var(--brand-soft)] px-1.5 py-0.5 text-[11px] text-[var(--brand)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete("articles", item.slug)}
                      disabled={deleting === `articles/${item.slug}`}
                      className="ml-3 shrink-0 rounded-[var(--radius-sm)] border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
                    >
                      {deleting === `articles/${item.slug}` ? "删除中..." : "删除"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Add Standard Form */}
          <section className="mb-8">
            <h2 className="mb-3 text-[15px] font-semibold text-[var(--text-primary)]">
              添加标准
            </h2>
            <div className="card p-5">
              <form onSubmit={handleAddStandard} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--text-muted)]">
                      标准编号 *
                    </label>
                    <input
                      type="text"
                      value={stdNumber}
                      onChange={(e) => setStdNumber(e.target.value)}
                      placeholder="例如：GBZ 49-2014"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[var(--text-muted)]">
                      标准名称
                    </label>
                    <input
                      type="text"
                      value={stdTitle}
                      onChange={(e) => setStdTitle(e.target.value)}
                      placeholder="例如：职业性噪声聋诊断标准"
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--text-muted)]">
                    摘要说明
                  </label>
                  <input
                    type="text"
                    value={stdSummary}
                    onChange={(e) => setStdSummary(e.target.value)}
                    placeholder="标准的简要说明（可选）"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--text-muted)]">
                    PDF 下载链接（自动下载并上传到网站）
                  </label>
                  <input
                    type="url"
                    value={stdPdfUrl}
                    onChange={(e) => setStdPdfUrl(e.target.value)}
                    placeholder="https://example.com/standard.pdf"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                    填入 PDF 链接后，系统会自动下载并上传到网站，在标准详情页提供预览和下载
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={addingStd || !stdNumber.trim()}
                    className="rounded-[var(--radius-sm)] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {addingStd ? "添加中..." : "添加标准"}
                  </button>
                  {stdResult && (
                    <span className={`text-[12px] ${stdResult.ok ? "text-green-600" : "text-red-500"}`}>
                      {stdResult.msg}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* Laws */}
          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-[var(--text-primary)]">
              标准法规 ({laws.length})
            </h2>
            {laws.length === 0 ? (
              <div className="card p-6 text-center text-[13px] text-[var(--text-muted)]">暂无法规</div>
            ) : (
              <div className="space-y-2">
                {laws.map((item) => (
                  <div key={item.slug} className="card flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14px] font-medium text-[var(--text-primary)]">{item.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-2">
                      <button
                        onClick={() => handlePdfUpload(item.slug)}
                        disabled={uploading === item.slug}
                        className="rounded-[var(--radius-sm)] border border-blue-200 px-3 py-1.5 text-[12px] font-medium text-blue-500 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:hover:bg-blue-950"
                      >
                        {uploading === item.slug ? "上传中..." : "上传PDF"}
                      </button>
                      <button
                        onClick={() => handleDelete("laws", item.slug)}
                        disabled={deleting === `laws/${item.slug}`}
                        className="rounded-[var(--radius-sm)] border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
                      >
                        {deleting === `laws/${item.slug}` ? "删除中..." : "删除"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
