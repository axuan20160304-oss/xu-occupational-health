#!/usr/bin/env node
/**
 * OpenClaw 发布助手 — 从 stdin 读取 JSON 并推送到网站
 *
 * 用法（OpenClaw 调用）：
 *   echo '{"module":"articles","title":"...","content":"..."}' | node scripts/openclaw-publish.mjs
 *
 * 或从文件：
 *   cat article.json | node scripts/openclaw-publish.mjs
 *
 * JSON 字段：
 *   module:   "laws" | "articles" | "standards"  (必填)
 *   title:    文章标题 (laws/articles 必填)
 *   summary:  摘要
 *   category: 分类
 *   tags:     ["标签1", "标签2"]
 *   content:  Markdown 正文 (laws/articles 必填)
 *   hazards:  GBZ 标准数组 (standards 必填)
 *   attachments: [{name, url, type}] 附件列表 (可选，url 为远程地址时自动下载到 public/uploads/)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import https from "node:https";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_DIR = join(ROOT, "content");

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
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildAttachmentsYaml(attachments) {
  if (!attachments || attachments.length === 0) return "attachments: []";
  return "attachments:\n" + attachments.map((a) =>
    `  - name: "${sanitizeYaml(a.name)}"\n    url: "${sanitizeYaml(a.url)}"\n    type: "${sanitizeYaml(a.type || "pdf")}"`
  ).join("\n");
}

function buildMdx({ title, summary, date, category, tags, author, content, attachments }) {
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
${buildAttachmentsYaml(attachments)}
---

${content}
`;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => {
      if (!data) resolve("");
    }, 5000);
  });
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.error("❌ 未收到 stdin 输入。请通过管道传入 JSON 数据。");
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    console.error("❌ JSON 解析失败:", e.message);
    process.exit(1);
  }

  const module = data.module || "articles";

  if (module === "standards") {
    if (!Array.isArray(data.hazards) || data.hazards.length === 0) {
      console.error("❌ standards 必须包含非空 hazards 数组");
      process.exit(1);
    }
    const dir = join(CONTENT_DIR, "standards");
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, "gbz-hazards.json");

    let existing = [];
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.hazards)) existing = parsed.hazards;
    } catch {}

    const map = new Map();
    for (const h of existing) map.set(h.code, h);
    for (const h of data.hazards) map.set(h.code, h);
    const merged = Array.from(map.values());

    writeFileSync(filePath, JSON.stringify({
      hazards: merged,
      source: "openclaw",
      updatedAt: new Date().toISOString(),
    }, null, 2), "utf-8");

    console.log(`✅ 已写入 ${data.hazards.length} 条GBZ标准（总计 ${merged.length} 条）`);
    gitCommitAndPush(filePath, `${data.hazards.length}条GBZ标准`, "standards");
    return;
  }

  // Handle images and ppts modules (JSON manifest + file download)
  if (module === "images" || module === "ppts") {
    if (!data.title || !data.filename) {
      console.error("❌ images/ppts 必须包含 title 和 filename 字段");
      process.exit(1);
    }

    const subDir = module === "images" ? "images" : "ppts";
    const uploadsDir = join(ROOT, "public", "uploads", subDir);
    mkdirSync(uploadsDir, { recursive: true });

    // Download file if URL provided
    let localFilename = data.filename;
    const filesToGitAdd = [];

    if (data.fileUrl) {
      const ext = data.filename.includes(".") ? "" : (module === "images" ? ".png" : ".pptx");
      localFilename = slugify(data.title) + ext;
      if (data.filename.includes(".")) {
        const origExt = data.filename.substring(data.filename.lastIndexOf("."));
        localFilename = slugify(data.title) + origExt;
      }
      const destPath = join(uploadsDir, localFilename);

      // Resolve ~ to home directory
      let srcPath = data.fileUrl;
      if (srcPath.startsWith("~")) {
        srcPath = join(process.env.HOME || "/tmp", srcPath.slice(1));
      }

      // Local file path: copy directly
      if (srcPath.startsWith("/") && !srcPath.startsWith("http")) {
        try {
          if (!existsSync(srcPath)) {
            console.log(`   ⚠️ 本地文件不存在: ${srcPath}`);
          } else {
            copyFileSync(srcPath, destPath);
            console.log(`   ✅ 已复制本地文件: ${srcPath} → ${localFilename}`);
            filesToGitAdd.push(destPath);
          }
        } catch (e) {
          console.log(`   ⚠️ 复制失败: ${e.message}`);
        }
      } else {
        // Remote URL: download
        try {
          console.log(`   ⬇️  下载文件: ${data.title} ...`);
          await downloadFile(data.fileUrl, destPath);
          console.log(`   ✅ 已下载: ${localFilename}`);
          filesToGitAdd.push(destPath);
        } catch (e) {
          console.log(`   ⚠️ 下载失败: ${e.message}`);
        }
      }
    }

    // Download thumbnail if provided
    let localThumbnail = data.thumbnail || undefined;
    if (data.thumbnailUrl) {
      const thumbName = `thumb-${slugify(data.title)}.png`;
      const thumbPath = join(uploadsDir, thumbName);
      try {
        console.log(`   ⬇️  下载缩略图...`);
        await downloadFile(data.thumbnailUrl, thumbPath);
        localThumbnail = thumbName;
        filesToGitAdd.push(thumbPath);
      } catch (e) {
        console.log(`   ⚠️ 缩略图下载失败: ${e.message}`);
      }
    }

    // Update manifest
    const manifestDir = join(CONTENT_DIR, subDir);
    mkdirSync(manifestDir, { recursive: true });
    const manifestPath = join(manifestDir, "manifest.json");

    let manifest = { items: [], updatedAt: new Date().toISOString() };
    try {
      const raw = readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(raw);
      if (!Array.isArray(manifest.items)) manifest.items = [];
    } catch {}

    const newItem = {
      id: data.id || slugify(data.title),
      title: data.title,
      description: data.description || "",
      filename: localFilename,
      thumbnail: localThumbnail,
      tags: data.tags || [],
      date: data.date || new Date().toISOString().slice(0, 10),
      source: data.source || "openclaw",
    };

    // Replace existing item with same id, or append
    const idx = manifest.items.findIndex((i) => i.id === newItem.id);
    if (idx >= 0) {
      manifest.items[idx] = newItem;
    } else {
      manifest.items.push(newItem);
    }
    manifest.updatedAt = new Date().toISOString();

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    filesToGitAdd.push(manifestPath);

    const label = module === "images" ? "图片" : "PPT";
    console.log(`✅ 已添加${label}：${data.title}`);
    console.log(`   文件：${localFilename}`);
    console.log(`   链接：https://xu-occupational-health.netlify.app/${module}`);

    gitCommitAndPush(filesToGitAdd, data.title, module);
    return;
  }

  if (!data.title || !data.content) {
    console.error("❌ 必须包含 title 和 content 字段");
    process.exit(1);
  }

  if (!["laws", "articles"].includes(module)) {
    console.error("❌ module 必须是 laws、articles、standards、images 或 ppts");
    process.exit(1);
  }

  // Handle attachments: download remote files to public/uploads/
  const localAttachments = await downloadAttachments(data.attachments || []);

  const dir = join(CONTENT_DIR, module);
  mkdirSync(dir, { recursive: true });
  const slug = slugify(data.title);
  const filePath = join(dir, `${slug}.mdx`);
  const mdx = buildMdx({ ...data, attachments: localAttachments });
  writeFileSync(filePath, mdx, "utf-8");

  const moduleLabels = { laws: "法规", articles: "文章" };
  console.log(`✅ 已写入${moduleLabels[module]}：${data.title}`);
  console.log(`   文件：${filePath}`);
  console.log(`   slug：${slug}`);
  console.log(`   链接：https://xu-occupational-health.netlify.app/${module}/${slug}`);
  if (localAttachments.length > 0) {
    console.log(`   📎 附件：${localAttachments.length} 个`);
    localAttachments.forEach((a) => console.log(`      - ${a.name} → ${a.url}`));
  }

  // Git add both content file and any locally downloaded attachments
  const localFiles = localAttachments
    .filter((a) => a.url.startsWith("/uploads/"))
    .map((a) => join(ROOT, "public", a.url));
  gitCommitAndPush([filePath, ...localFiles], data.title, module);
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const request = (reqUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error("Too many redirects"));
      proto.get(reqUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          mkdirSync(dirname(destPath), { recursive: true });
          writeFileSync(destPath, Buffer.concat(chunks));
          resolve();
        });
        res.on("error", reject);
      }).on("error", reject);
    };
    request(url);
  });
}

async function downloadAttachments(attachments) {
  if (!attachments || attachments.length === 0) return [];
  const uploadsDir = join(ROOT, "public", "uploads");
  mkdirSync(uploadsDir, { recursive: true });
  const results = [];
  for (const att of attachments) {
    if (!att.url || !att.name) continue;
    // If already a local path, keep as-is
    if (att.url.startsWith("/uploads/")) {
      results.push(att);
      continue;
    }
    // Remote URL: download to public/uploads/
    const ext = extname(new URL(att.url).pathname) || ".pdf";
    const filename = slugify(att.name) + ext;
    const destPath = join(uploadsDir, filename);
    try {
      console.log(`   ⬇️  下载附件: ${att.name} ...`);
      await downloadFile(att.url, destPath);
      console.log(`   ✅ 已下载: ${filename}`);
      results.push({ name: att.name, url: `/uploads/${filename}`, type: att.type || "pdf" });
    } catch (e) {
      console.log(`   ⚠️ 下载失败: ${att.name} - ${e.message}`);
      // Still include the remote URL as fallback
      results.push(att);
    }
  }
  return results;
}

function gitCommitAndPush(filePaths, title, module) {
  const labels = { laws: "法规", articles: "文章", standards: "GBZ标准", images: "图片", ppts: "PPT" };
  const label = labels[module] || module;
  const msg = `content: 添加${label} - ${title}`;
  try {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    for (const fp of paths) {
      execSync(`git add "${fp}"`, { cwd: ROOT, stdio: "pipe" });
    }
    execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { cwd: ROOT, stdio: "pipe" });
    console.log(`   📦 Git commit 成功`);
  } catch (e) {
    console.log(`   ⚠️ Git: ${e.message.split("\n")[0]}`);
    return;
  }
  // Auto push to remote
  try {
    execSync(`git push origin main`, { cwd: ROOT, stdio: "pipe" });
    console.log(`   🚀 Git push 成功`);
  } catch (e) {
    console.log(`   ⚠️ Git push: ${e.message.split("\n")[0]}`);
  }
  // Auto deploy to Vercel
  try {
    console.log(`   🌐 正在部署到 Vercel...`);
    execSync(`vercel --prod --yes`, { cwd: ROOT, stdio: "pipe", timeout: 180000 });
    console.log(`   ✅ Vercel 部署成功`);
  } catch (e) {
    console.log(`   ⚠️ Vercel 部署: ${e.message.split("\n")[0]}`);
  }
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
