import { NextRequest, NextResponse } from "next/server";
import { type UpsertContentPayload, writeContentFile } from "@/lib/content-write";

export const runtime = "nodejs";

/**
 * OpenClaw Webhook 端点
 *
 * 接收来自 OpenClaw Telegram 机器人的消息，自动解析并添加内容。
 *
 * 支持的指令格式：
 * 1. JSON 格式 — 直接发送结构化数据
 * 2. 自然语言指令 — 如 "更新法规：xxx" 或 "添加文章：xxx"
 *
 * Webhook URL: https://your-site.netlify.app/api/webhook/openclaw?apiKey=<key>
 */

interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface ParsedContent {
  module: "laws" | "articles";
  title: string;
  summary: string;
  category: string;
  tags: string[];
  content: string;
}

const LAW_TRIGGERS = ["法规", "法律", "条例", "规定", "标准", "规范", "gbz", "办法", "通知"];
const ARTICLE_TRIGGERS = ["文章", "案例", "指南", "实务", "分析", "经验", "总结"];

function parseNaturalLanguage(text: string): ParsedContent | null {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;

  const firstLine = lines[0].trim();

  // 检测模块类型
  let module: "laws" | "articles" = "articles";
  const lowerFirst = firstLine.toLowerCase();
  if (LAW_TRIGGERS.some((t) => lowerFirst.includes(t))) {
    module = "laws";
  }

  // 提取标题 — 去掉指令前缀
  let title = firstLine
    .replace(/^(更新|添加|新增|发布|推送)(法规|法律|文章|案例|标准|内容)[：:]\s*/i, "")
    .trim();

  if (!title || title.length < 2) {
    title = firstLine;
  }

  // 提取摘要 — 第二行
  const summary = lines[1]?.trim() || "";

  // 提取标签 — 查找 #tag 格式
  const tagMatches = text.match(/#[\u4e00-\u9fffA-Za-z0-9]+/g) || [];
  const tags = tagMatches.map((t) => t.replace("#", ""));

  // 剩余内容作为正文
  const contentLines = lines.slice(2).filter((l) => !l.startsWith("#") || l.startsWith("## "));
  const content = contentLines.length > 0
    ? contentLines.join("\n\n")
    : `## ${title}\n\n${summary}`;

  // 自动分类
  let category = module === "laws" ? "标准规范" : "实务指南";
  if (lowerFirst.includes("案例")) category = "案例分析";
  if (lowerFirst.includes("法律") || lowerFirst.includes("法规")) category = "国家法律";
  if (lowerFirst.includes("标准") || lowerFirst.includes("gbz")) category = "标准规范";
  if (lowerFirst.includes("规定") || lowerFirst.includes("办法")) category = "部门规章";

  return { module, title, summary, category, tags, content };
}

function tryParseJSON(text: string): Record<string, unknown> | null {
  // 尝试提取 JSON 块
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    return null;
  }
}

function checkApiKey(request: NextRequest): boolean {
  const expected = process.env.CONTENT_API_KEY;
  if (!expected) return true;

  const key =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("apiKey");

  return key === expected;
}

export async function POST(request: NextRequest) {
  if (!checkApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TelegramUpdate | Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 支持 Telegram webhook 格式
  const update = body as TelegramUpdate;
  const text = update.message?.text || (body as Record<string, unknown>).text as string || "";

  if (!text || text.trim().length < 5) {
    return NextResponse.json({
      ok: true,
      message: "消息太短，已忽略。发送内容时请包含标题和正文。",
    });
  }

  // 尝试 JSON 格式
  const jsonData = tryParseJSON(text);
  if (jsonData && jsonData.title && jsonData.content) {
    const module = detectModuleFromData(jsonData);
    const payload: UpsertContentPayload = {
      title: String(jsonData.title),
      content: String(jsonData.content),
      summary: jsonData.summary as string | undefined,
      date: jsonData.date as string | undefined,
      tags: Array.isArray(jsonData.tags) ? jsonData.tags.map(String) : undefined,
      category: jsonData.category as string | undefined,
      author: jsonData.author as string | undefined,
      source: "openclaw",
    };

    const result = await writeContentFile(module, payload);
    return NextResponse.json({
      ok: true,
      module,
      slug: result.slug,
      message: `✅ 已添加${module === "laws" ? "法规" : "文章"}：${payload.title}`,
    });
  }

  // 尝试自然语言解析
  const parsed = parseNaturalLanguage(text);
  if (parsed) {
    const payload: UpsertContentPayload = {
      title: parsed.title,
      content: parsed.content,
      summary: parsed.summary,
      tags: parsed.tags.length > 0 ? parsed.tags : undefined,
      category: parsed.category,
      source: "openclaw",
    };

    const result = await writeContentFile(parsed.module, payload);
    return NextResponse.json({
      ok: true,
      module: parsed.module,
      slug: result.slug,
      message: `✅ 已添加${parsed.module === "laws" ? "法规" : "文章"}：${parsed.title}`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "无法解析内容。请使用以下格式：\n\n更新法规：标题\n摘要内容\n正文内容\n#标签1 #标签2\n\n或发送 JSON 格式数据。",
  });
}

function detectModuleFromData(data: Record<string, unknown>): "laws" | "articles" {
  const title = String(data.title || "");
  const category = String(data.category || "");
  const tags = Array.isArray(data.tags) ? data.tags.join(" ") : "";
  const combined = `${title} ${category} ${tags}`.toLowerCase();

  const lawKeywords = ["法", "条例", "规定", "办法", "标准", "规范", "gbz", "通知"];
  return lawKeywords.some((kw) => combined.includes(kw)) ? "laws" : "articles";
}

// GET — 返回 webhook 配置说明
export async function GET() {
  return NextResponse.json({
    name: "OpenClaw Webhook",
    description: "接收 OpenClaw Telegram 机器人消息，自动添加内容到网站",
    setup: {
      step1: "在 Telegram 中配置 OpenClaw 机器人的 Webhook URL",
      step2: "设置 URL 为: https://your-site.netlify.app/api/webhook/openclaw?apiKey=<your-key>",
      step3: "发送内容给机器人，格式如下",
    },
    formats: {
      naturalLanguage: [
        "更新法规：《职业病防治法》修订要点",
        "2026年最新修订内容摘要",
        "## 修订背景",
        "正文内容...",
        "#职业病防治法 #法律修订",
      ],
      json: {
        title: "法规标题",
        summary: "摘要",
        category: "国家法律",
        tags: ["标签1", "标签2"],
        content: "## 正文\n\n内容...",
      },
    },
  });
}
