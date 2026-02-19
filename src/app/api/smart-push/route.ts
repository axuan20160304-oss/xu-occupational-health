import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { type UpsertContentPayload, writeContentFile } from "@/lib/content-write";
import { saveStandardsSnapshot } from "@/lib/standards-store";
import type { GbzHazard } from "@/data/gbz188";

export const runtime = "nodejs";

/**
 * 智能内容推送 API
 *
 * 支持通过 OpenClaw / Telegram 等工具自动添加内容到 4 个模块：
 * - laws（法律法规）
 * - articles（专业文章）
 * - media（多媒体资料）
 * - standards（GBZ 标准）
 *
 * 请求格式：
 * POST /api/smart-push
 * Headers: x-api-key: <your-api-key>
 * Body: {
 *   "module": "laws" | "articles" | "media" | "standards" | "auto",
 *   "action": "add" | "update",
 *   "data": { ... }  // 模块对应的数据
 * }
 *
 * 当 module 为 "auto" 时，根据 data 内容自动判断目标模块。
 */

type ModuleType = "laws" | "articles" | "media" | "standards" | "auto";

interface SmartPushPayload {
  module?: ModuleType;
  action?: "add" | "update";
  data?: Record<string, unknown>;
}

function detectModule(data: Record<string, unknown>): ModuleType {
  // 如果有 hazards 字段，说明是标准数据
  if (Array.isArray(data.hazards)) return "standards";

  // 如果有 fileData 和 fileName，说明是媒体文件
  if (data.fileData && data.fileName) return "media";

  // 如果有 title 和 content，根据关键词判断法规还是文章
  if (data.title && data.content) {
    const title = String(data.title);
    const category = String(data.category || "");
    const tags = Array.isArray(data.tags) ? data.tags.join(" ") : "";
    const combined = `${title} ${category} ${tags}`.toLowerCase();

    const lawKeywords = [
      "法", "条例", "规定", "办法", "标准", "规范", "gbz", "通知",
      "决定", "意见", "公告", "令", "制度", "管理办法", "实施细则",
      "law", "regulation", "standard", "rule",
    ];

    const isLaw = lawKeywords.some((kw) => combined.includes(kw));
    return isLaw ? "laws" : "articles";
  }

  return "articles";
}

async function handleContentPush(
  module: "laws" | "articles",
  data: Record<string, unknown>,
) {
  const payload: UpsertContentPayload = {
    slug: data.slug as string | undefined,
    title: String(data.title || ""),
    summary: data.summary as string | undefined,
    date: data.date as string | undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    category: data.category as string | undefined,
    author: data.author as string | undefined,
    source: data.source as string | undefined,
    content: String(data.content || ""),
  };

  if (!payload.title || payload.title.trim().length < 2) {
    return { success: false, message: "title 为必填项，且长度至少为 2。" };
  }
  if (!payload.content || payload.content.trim().length < 10) {
    return { success: false, message: "content 为必填项，且长度至少为 10。" };
  }

  const result = await writeContentFile(module, payload);
  return {
    success: true,
    module,
    slug: result.slug,
    filePath: result.filePath,
    message: `已成功添加${module === "laws" ? "法规" : "文章"}：${payload.title}`,
  };
}

async function handleMediaPush(data: Record<string, unknown>) {
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");

  const fileName = String(data.fileName || "");
  const fileData = String(data.fileData || "");

  if (!fileName) return { success: false, message: "fileName 为必填字符串。" };
  if (!fileData) return { success: false, message: "fileData 为必填 Base64 字符串。" };

  const safeName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `upload-${Date.now()}.bin`;

  const normalized = fileData.includes(",") ? fileData.split(",").at(-1) ?? "" : fileData;
  const fileBuffer = Buffer.from(normalized, "base64");

  if (fileBuffer.length === 0) return { success: false, message: "fileData 解码后为空。" };
  if (fileBuffer.length > 20 * 1024 * 1024) return { success: false, message: "文件超过 20MB 限制。" };

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const finalName = `${Date.now()}-${safeName}`;
  await fs.writeFile(path.join(uploadDir, finalName), fileBuffer);

  return {
    success: true,
    module: "media",
    fileName: finalName,
    url: `/uploads/${finalName}`,
    bytes: fileBuffer.length,
    message: `已上传媒体文件：${finalName}`,
  };
}

async function handleStandardsPush(data: Record<string, unknown>) {
  const hazards = data.hazards as GbzHazard[];
  if (!Array.isArray(hazards) || hazards.length === 0) {
    return { success: false, message: "hazards 必须是非空数组。" };
  }

  const snapshot = await saveStandardsSnapshot(
    hazards,
    String(data.source || "smart-push"),
  );

  return {
    success: true,
    module: "standards",
    updatedAt: snapshot.updatedAt,
    count: snapshot.hazards.length,
    message: `已更新 ${snapshot.hazards.length} 条 GBZ 标准数据`,
  };
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  let payload: SmartPushPayload;
  try {
    payload = (await request.json()) as SmartPushPayload;
  } catch {
    return NextResponse.json(
      { success: false, message: "请求体必须是合法 JSON。" },
      { status: 400 },
    );
  }

  const data = payload.data;
  if (!data || typeof data !== "object") {
    return NextResponse.json(
      { success: false, message: "data 字段为必填对象。" },
      { status: 400 },
    );
  }

  const module = payload.module === "auto" || !payload.module
    ? detectModule(data)
    : payload.module;

  try {
    let result;
    switch (module) {
      case "laws":
      case "articles":
        result = await handleContentPush(module, data);
        break;
      case "media":
        result = await handleMediaPush(data);
        break;
      case "standards":
        result = await handleStandardsPush(data);
        break;
      default:
        return NextResponse.json(
          { success: false, message: `不支持的模块: ${module}` },
          { status: 400 },
        );
    }

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `处理失败: ${message}` },
      { status: 500 },
    );
  }
}

// GET 端点 — 返回 API 使用说明
export async function GET() {
  return NextResponse.json({
    name: "智能内容推送 API",
    version: "1.0",
    description: "支持通过 OpenClaw / Telegram 等工具自动添加内容到网站",
    usage: {
      method: "POST",
      headers: { "x-api-key": "<your-api-key>", "Content-Type": "application/json" },
      body: {
        module: "laws | articles | media | standards | auto（自动识别）",
        action: "add | update",
        data: "模块对应的数据对象",
      },
    },
    modules: {
      laws: {
        description: "法律法规",
        fields: "title*, content*, summary, date, tags[], category, author, source",
      },
      articles: {
        description: "专业文章",
        fields: "title*, content*, summary, date, tags[], category, author, source",
      },
      media: {
        description: "多媒体资料",
        fields: "fileName*, fileData*(base64)",
      },
      standards: {
        description: "GBZ 标准数据",
        fields: "hazards[]*: { code, name, category, checks[], cycle, contraindications[], targetDiseases[] }",
      },
    },
    examples: {
      addLaw: {
        module: "laws",
        data: {
          title: "新职业病防治条例解读",
          summary: "2026年最新条例要点",
          category: "国家法律",
          tags: ["职业病防治法", "法律解读"],
          content: "## 条例背景\n\n正文内容...",
        },
      },
      autoDetect: {
        module: "auto",
        data: {
          title: "噪声作业健康监护实务",
          summary: "噪声暴露人群的监护要点",
          category: "实务指南",
          tags: ["噪声", "健康监护"],
          content: "## 监护流程\n\n正文内容...",
        },
      },
    },
  });
}
