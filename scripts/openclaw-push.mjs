#!/usr/bin/env node
/**
 * OpenClaw 智能内容推送脚本
 *
 * 支持自然语言指令，自动识别内容类型并写入对应 MDX 文件，
 * 然后 git commit + push 触发 Netlify 自动部署。
 *
 * 用法：
 *   # 交互模式（推荐）
 *   node scripts/openclaw-push.mjs
 *
 *   # 直接指令模式
 *   node scripts/openclaw-push.mjs "更新法规：《职业病防治法》2026修订要点"
 *
 *   # JSON 模式
 *   node scripts/openclaw-push.mjs --json laws '{"title":"法规标题","content":"正文"}'
 *
 *   # 从文件推送
 *   node scripts/openclaw-push.mjs --file laws content.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_DIR = join(ROOT, "content");

// ─── 工具函数 ───

function slugify(text) {
  const ascii = text
    .toLowerCase()
    .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const suffix = String(Date.now()).slice(-6);
  if (ascii && ascii.length >= 3) return `${ascii}-${suffix}`;
  return `post-${suffix}`;
}

function sanitizeYaml(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildMdx({ title, summary, date, category, tags, author, content }) {
  const d = date || new Date().toISOString().slice(0, 10);
  const t = tags && tags.length > 0
    ? tags.map((tag) => `  - "${sanitizeYaml(tag)}"`).join("\n")
    : '  - "无标签"';

  return `---
title: "${sanitizeYaml(title)}"
summary: "${sanitizeYaml(summary || "")}"
date: "${d}"
category: "${sanitizeYaml(category || "未分类")}"
${author ? `author: "${sanitizeYaml(author)}"` : ""}
tags:
${t}
attachments: []
---

${content}
`;
}

// ─── 自然语言解析 ───

const LAW_KEYWORDS = [
  "法规", "法律", "条例", "规定", "办法", "标准", "规范", "gbz",
  "通知", "决定", "意见", "公告", "制度", "细则", "管理办法",
];

const ARTICLE_KEYWORDS = [
  "文章", "案例", "指南", "实务", "分析", "经验", "总结",
  "监护", "流程", "复盘", "管理",
];

function detectModule(text) {
  const lower = text.toLowerCase();
  if (LAW_KEYWORDS.some((kw) => lower.includes(kw))) return "laws";
  if (ARTICLE_KEYWORDS.some((kw) => lower.includes(kw))) return "articles";
  return "articles";
}

function detectCategory(text, module) {
  const lower = text.toLowerCase();
  if (module === "laws") {
    if (lower.includes("法律") || lower.includes("法规")) return "国家法律";
    if (lower.includes("规定") || lower.includes("办法")) return "部门规章";
    return "标准规范";
  }
  if (lower.includes("案例")) return "案例分析";
  if (lower.includes("指南") || lower.includes("实务")) return "实务指南";
  return "实务指南";
}

function parseNaturalLanguage(input) {
  const lines = input.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return null;

  const firstLine = lines[0].trim();

  // 提取标题
  let title = firstLine
    .replace(/^(更新|添加|新增|发布|推送)(法规|法律|文章|案例|标准|内容)[：:]\s*/i, "")
    .trim();
  if (!title || title.length < 2) title = firstLine;

  const module = detectModule(firstLine);
  const category = detectCategory(firstLine, module);

  // 提取摘要
  const summary = lines.length > 1 ? lines[1].trim() : "";

  // 提取标签
  const tagMatches = input.match(/#[\u4e00-\u9fffA-Za-z0-9_]+/g) || [];
  const tags = tagMatches.map((t) => t.replace("#", ""));

  // 正文
  const contentLines = lines.slice(2).filter((l) => !l.match(/^#[^\s#]/));
  const content = contentLines.length > 0
    ? contentLines.join("\n\n")
    : `## ${title}\n\n${summary || "（待补充正文内容）"}`;

  return { module, title, summary, category, tags, content };
}

// ─── 文件写入 ───

function writeContent(module, data) {
  const dir = join(CONTENT_DIR, module);
  mkdirSync(dir, { recursive: true });

  const slug = data.slug || slugify(data.title);
  const filePath = join(dir, `${slug}.mdx`);
  const mdx = buildMdx(data);

  writeFileSync(filePath, mdx, "utf-8");

  return { slug, filePath, module };
}

function writeStandards(hazards, source = "openclaw") {
  const dir = join(CONTENT_DIR, "standards");
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, "gbz-hazards.json");

  // 读取现有数据并合并
  let existing = [];
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.hazards)) existing = parsed.hazards;
  } catch { /* 文件不存在或格式错误 */ }

  // 按 code 去重合并（新数据覆盖旧数据）
  const map = new Map();
  for (const h of existing) map.set(h.code, h);
  for (const h of hazards) map.set(h.code, h);

  const merged = Array.from(map.values());
  const snapshot = {
    hazards: merged,
    source,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

  return { filePath, count: hazards.length, total: merged.length };
}

// ─── Git 操作 ───

function gitCommitAndPush(filePath, title, module) {
  const moduleLabels = { laws: "法规", articles: "文章", standards: "GBZ标准" };
  const moduleLabel = moduleLabels[module] || module;
  const commitMsg = `content: 添加${moduleLabel} - ${title}`;

  try {
    execSync(`git add "${filePath}"`, { cwd: ROOT, stdio: "pipe" });
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    console.log(`   📦 Git commit: ${commitMsg}`);

    execSync("git push", { cwd: ROOT, stdio: "pipe" });
    console.log("   🚀 Git push 成功！Netlify 将自动重新部署。");
    return true;
  } catch (err) {
    console.log(`   ⚠️  Git 操作失败: ${err.message}`);
    console.log("   💡 文件已写入本地，请手动 git add/commit/push");
    return false;
  }
}

// ─── 交互模式 ───

async function interactiveMode() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   🤖 OpenClaw 智能内容推送               ║");
  console.log("║   输入内容自动识别类型并发布到网站        ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("支持的指令格式：");
  console.log("  更新法规：《法规标题》");
  console.log("  添加文章：文章标题");
  console.log("  输入 quit 退出\n");

  while (true) {
    const input = await ask("📝 请输入指令（或多行内容，空行结束）：\n> ");

    if (input.trim().toLowerCase() === "quit" || input.trim().toLowerCase() === "exit") {
      console.log("\n👋 再见！");
      rl.close();
      break;
    }

    // 收集多行输入
    let fullInput = input;
    if (input.trim().length > 0) {
      let line;
      while ((line = await ask("> ")) !== "") {
        fullInput += "\n" + line;
      }
    }

    if (fullInput.trim().length < 5) {
      console.log("   ⚠️  内容太短，请至少输入标题和摘要。\n");
      continue;
    }

    const parsed = parseNaturalLanguage(fullInput);
    if (!parsed) {
      console.log("   ❌ 无法解析内容，请重试。\n");
      continue;
    }

    const moduleLabel = parsed.module === "laws" ? "法规" : "文章";
    console.log(`\n   📋 识别结果：`);
    console.log(`      类型: ${moduleLabel}`);
    console.log(`      标题: ${parsed.title}`);
    console.log(`      分类: ${parsed.category}`);
    console.log(`      标签: ${parsed.tags.length > 0 ? parsed.tags.join(", ") : "（无）"}`);

    const confirm = await ask("\n   确认推送？(y/n) ");
    if (confirm.trim().toLowerCase() !== "y") {
      console.log("   ⏭️  已跳过。\n");
      continue;
    }

    const result = writeContent(parsed.module, parsed);
    console.log(`\n   ✅ 文件已写入: ${basename(result.filePath)}`);

    const pushConfirm = await ask("   是否 git push 触发部署？(y/n) ");
    if (pushConfirm.trim().toLowerCase() === "y") {
      gitCommitAndPush(result.filePath, parsed.title, parsed.module);
    } else {
      console.log(`   💡 文件路径: ${result.filePath}`);
      console.log("   💡 请手动 git add/commit/push 完成部署。");
    }

    console.log("");
  }
}

// ─── 主入口 ───

async function main() {
  const args = process.argv.slice(2);

  // 无参数 → 交互模式
  if (args.length === 0) {
    await interactiveMode();
    return;
  }

  // --json 模式
  if (args[0] === "--json") {
    const module = args[1];
    const jsonStr = args[2];
    if (!module || !["laws", "articles", "standards"].includes(module)) {
      console.error("用法: node scripts/openclaw-push.mjs --json <laws|articles|standards> '<JSON>'");
      process.exit(1);
    }
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      console.error("❌ JSON 解析失败");
      process.exit(1);
    }

    if (module === "standards") {
      if (!Array.isArray(data.hazards) || data.hazards.length === 0) {
        console.error("❌ standards JSON 必须包含非空 hazards 数组");
        process.exit(1);
      }
      const result = writeStandards(data.hazards, data.source || "openclaw");
      console.log(`✅ 已写入 ${result.count} 条GBZ标准（总计 ${result.total} 条）`);
      console.log(`   文件: ${result.filePath}`);
      gitCommitAndPush(result.filePath, `${result.count}条GBZ标准`, "standards");
      return;
    }

    if (!data.title || !data.content) {
      console.error("❌ JSON 必须包含 title 和 content");
      process.exit(1);
    }
    const result = writeContent(module, data);
    console.log(`✅ 已写入: ${result.filePath}`);
    gitCommitAndPush(result.filePath, data.title, module);
    return;
  }

  // --file 模式
  if (args[0] === "--file") {
    const module = args[1];
    const filePath = args[2];
    if (!module || !filePath) {
      console.error("用法: node scripts/openclaw-push.mjs --file <laws|articles> <file.json>");
      process.exit(1);
    }
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const result = writeContent(module, data);
    console.log(`✅ 已写入: ${result.filePath}`);
    gitCommitAndPush(result.filePath, data.title, module);
    return;
  }

  // 自然语言模式
  const input = args.join(" ");
  const parsed = parseNaturalLanguage(input);
  if (!parsed) {
    console.error("❌ 无法解析指令");
    process.exit(1);
  }

  const moduleLabel = parsed.module === "laws" ? "法规" : "文章";
  console.log(`\n📋 识别结果：`);
  console.log(`   类型: ${moduleLabel}`);
  console.log(`   标题: ${parsed.title}`);
  console.log(`   分类: ${parsed.category}`);

  const result = writeContent(parsed.module, parsed);
  console.log(`\n✅ 文件已写入: ${result.filePath}`);
  gitCommitAndPush(result.filePath, parsed.title, parsed.module);
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
