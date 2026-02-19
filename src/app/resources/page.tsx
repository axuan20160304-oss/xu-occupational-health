import { SectionTitle } from "@/components/ui/section-title";

const endpointRows = [
  {
    endpoint: "POST /api/laws",
    purpose: "新增或更新法规内容（MDX）",
    required: "title, content, x-api-key",
  },
  {
    endpoint: "POST /api/articles",
    purpose: "新增或更新专业文章（MDX）",
    required: "title, content, x-api-key",
  },
  {
    endpoint: "POST /api/media",
    purpose: "上传图片/PDF/PPT/音频等媒体",
    required: "fileName, fileData(base64), x-api-key",
  },
  {
    endpoint: "POST /api/standards",
    purpose: "更新标准结构化数据",
    required: "hazards(array), x-api-key",
  },
] as const;

export default function ResourcesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Resources & API"
        title="工具资源与 API 对接"
        description="用于连接 OpenClaw、NotebookLM 及其他自动化工具，实现内容持续更新与多媒体管理。"
      />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">API 接口总览</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th className="py-2 pr-4">Endpoint</th>
                <th className="py-2 pr-4">用途</th>
                <th className="py-2">必要参数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
              {endpointRows.map((row) => (
                <tr key={row.endpoint}>
                  <td className="py-3 pr-4 font-mono text-xs sm:text-sm">{row.endpoint}</td>
                  <td className="py-3 pr-4">{row.purpose}</td>
                  <td className="py-3">{row.required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">OpenClaw / NotebookLM 对接流程</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--text-muted)]">
          <li>AI 工具采集或生成内容后，按照 JSON payload 调用对应 API。</li>
          <li>后端校验 API Key 并将内容写入 content/ 或 public/uploads/。</li>
          <li>Next.js 页面读取最新内容并在前台展示。</li>
          <li>生产环境可结合部署平台 Webhook 触发增量构建。</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">示例：发布一篇新法规</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--surface-alt)] p-4 text-xs leading-6 text-[var(--text-muted)] sm:text-sm">
{`curl -X POST http://localhost:3000/api/laws \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_CONTENT_API_KEY" \\
  -d '{
    "title": "新法规标题",
    "summary": "法规摘要",
    "category": "国家法律",
    "tags": ["法规", "职业健康"],
    "content": "## 正文\n法规内容..."
  }'`}
        </pre>
      </section>
    </div>
  );
}
