#!/usr/bin/env node
/**
 * 网站全模块自动维护脚本 — 每小时运行
 *
 * 功能：
 *   1. 标准模块：调用 standards-auto-update.mjs 检查新标准
 *   2. 文章模块：检查文章完整性和链接有效性
 *   3. 图片模块：验证图片文件存在性
 *   4. PPT模块：验证PPT文件存在性
 *   5. 网站健康检查：验证所有页面可访问
 *
 * 用法：
 *   node scripts/site-auto-maintain.mjs          # 完整维护
 *   node scripts/site-auto-maintain.mjs --check   # 仅检查不修改
 *
 * 定时任务（crontab -e）：
 *   0 * * * * cd /Users/xuguangjun/徐广军个人网站/site && /usr/local/bin/node scripts/site-auto-maintain.mjs >> /tmp/site-maintain.log 2>&1
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, statSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOG_PATH = "/tmp/site-maintain.log";
const HEALTH_PATH = "/tmp/site-maintain-health.json";
const LOCK_PATH = "/tmp/site-maintain.lock";
const CHECK_ONLY = process.argv.includes("--check");

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    // Log rotation at 5MB
    if (existsSync(LOG_PATH) && statSync(LOG_PATH).size > 5 * 1024 * 1024) {
      const content = readFileSync(LOG_PATH, "utf-8");
      writeFileSync(LOG_PATH, content.slice(-1024 * 1024), "utf-8");
    }
    appendFileSync(LOG_PATH, line + "\n");
  } catch {}
}

function acquireLock() {
  if (existsSync(LOCK_PATH)) {
    try {
      const lockData = JSON.parse(readFileSync(LOCK_PATH, "utf-8"));
      if (Date.now() - lockData.timestamp > 30 * 60 * 1000) {
        unlinkSync(LOCK_PATH);
      } else {
        log(`⏳ 另一个维护实例正在运行，跳过`);
        return false;
      }
    } catch { unlinkSync(LOCK_PATH); }
  }
  writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
  return true;
}

function releaseLock() {
  try { unlinkSync(LOCK_PATH); } catch {}
}

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 10000 }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode === 200 });
      res.resume();
    });
    req.on("error", (e) => resolve({ status: 0, ok: false, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, ok: false, error: "timeout" }); });
  });
}

async function main() {
  log("╔══════════════════════════════════════╗");
  log("║  网站全模块自动维护" + (CHECK_ONLY ? " [CHECK]" : "") + "  ║");
  log("╚══════════════════════════════════════╝");

  if (!acquireLock()) {
    writeHealthStatus("skipped");
    return;
  }

  const report = {
    standards: { status: "pending" },
    articles: { status: "pending" },
    images: { status: "pending" },
    ppts: { status: "pending" },
    website: { status: "pending" },
  };
  const errors = [];

  // ═══════════════════════════════════════
  // 1. 标准模块维护
  // ═══════════════════════════════════════
  log("\n📋 [1/5] 标准模块维护...");
  try {
    const flag = CHECK_ONLY ? "--dry-run" : "";
    const result = execSync(
      `node "${join(__dirname, "standards-auto-update.mjs")}" ${flag}`,
      { cwd: ROOT, stdio: "pipe", timeout: 120000 }
    ).toString();
    
    const newCount = result.match(/发现 (\d+) 个新标准/);
    report.standards = {
      status: "ok",
      newStandards: newCount ? parseInt(newCount[1]) : 0,
      message: result.includes("未发现新标准") ? "无新标准" : `发现${newCount?.[1] || "?"}个新标准`,
    };
    log(`   ✅ 标准模块: ${report.standards.message}`);
  } catch (e) {
    report.standards = { status: "error", message: e.message.split("\n")[0] };
    errors.push(`标准模块: ${e.message.split("\n")[0]}`);
    log(`   ⚠️ 标准模块: ${e.message.split("\n")[0]}`);
  }

  // ═══════════════════════════════════════
  // 2. 文章模块检查
  // ═══════════════════════════════════════
  log("\n📝 [2/5] 文章模块检查...");
  try {
    const articlesDir = join(ROOT, "content/articles");
    const files = execSync(`ls "${articlesDir}"/*.mdx 2>/dev/null | wc -l`, { stdio: "pipe" }).toString().trim();
    const count = parseInt(files) || 0;
    
    // Check for any MDX compilation issues
    let brokenFiles = 0;
    try {
      const broken = execSync(
        `grep -rl "^---$" "${articlesDir}"/*.mdx 2>/dev/null | while read f; do head -1 "$f" | grep -q "^---$" || echo "$f"; done | wc -l`,
        { stdio: "pipe" }
      ).toString().trim();
      brokenFiles = parseInt(broken) || 0;
    } catch {}

    report.articles = {
      status: brokenFiles > 0 ? "warning" : "ok",
      totalFiles: count,
      brokenFiles,
      message: `${count}篇文章${brokenFiles > 0 ? `，${brokenFiles}个格式异常` : ""}`,
    };
    log(`   ✅ 文章模块: ${report.articles.message}`);
  } catch (e) {
    report.articles = { status: "error", message: e.message.split("\n")[0] };
    errors.push(`文章模块: ${e.message.split("\n")[0]}`);
    log(`   ⚠️ 文章模块: ${e.message.split("\n")[0]}`);
  }

  // ═══════════════════════════════════════
  // 3. 图片模块检查
  // ═══════════════════════════════════════
  log("\n🖼️ [3/5] 图片模块检查...");
  try {
    const manifestPath = join(ROOT, "content/images/manifest.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      const items = manifest.items || [];
      let missingFiles = 0;
      for (const item of items) {
        const filePath = join(ROOT, "public/uploads/images", item.filename);
        if (!existsSync(filePath)) {
          missingFiles++;
          log(`   ⚠️ 缺失文件: ${item.filename}`);
        }
      }
      report.images = {
        status: missingFiles > 0 ? "warning" : "ok",
        totalItems: items.length,
        missingFiles,
        message: `${items.length}张图片${missingFiles > 0 ? `，${missingFiles}个文件缺失` : ""}`,
      };
    } else {
      report.images = { status: "ok", totalItems: 0, message: "manifest不存在" };
    }
    log(`   ✅ 图片模块: ${report.images.message}`);
  } catch (e) {
    report.images = { status: "error", message: e.message.split("\n")[0] };
    errors.push(`图片模块: ${e.message.split("\n")[0]}`);
    log(`   ⚠️ 图片模块: ${e.message.split("\n")[0]}`);
  }

  // ═══════════════════════════════════════
  // 4. PPT模块检查
  // ═══════════════════════════════════════
  log("\n📊 [4/5] PPT模块检查...");
  try {
    const manifestPath = join(ROOT, "content/ppts/manifest.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      const items = manifest.items || [];
      let missingFiles = 0;
      for (const item of items) {
        const filePath = join(ROOT, "public/uploads/ppts", item.filename);
        if (!existsSync(filePath)) {
          missingFiles++;
          log(`   ⚠️ 缺失文件: ${item.filename}`);
        }
      }
      report.ppts = {
        status: missingFiles > 0 ? "warning" : "ok",
        totalItems: items.length,
        missingFiles,
        message: `${items.length}个PPT${missingFiles > 0 ? `，${missingFiles}个文件缺失` : ""}`,
      };
    } else {
      report.ppts = { status: "ok", totalItems: 0, message: "manifest不存在" };
    }
    log(`   ✅ PPT模块: ${report.ppts.message}`);
  } catch (e) {
    report.ppts = { status: "error", message: e.message.split("\n")[0] };
    errors.push(`PPT模块: ${e.message.split("\n")[0]}`);
    log(`   ⚠️ PPT模块: ${e.message.split("\n")[0]}`);
  }

  // ═══════════════════════════════════════
  // 5. 网站健康检查
  // ═══════════════════════════════════════
  log("\n🌐 [5/5] 网站健康检查...");
  const pages = [
    { name: "首页", url: "http://localhost:3000/" },
    { name: "标准", url: "http://localhost:3000/standards" },
    { name: "文章", url: "http://localhost:3000/articles" },
    { name: "图片", url: "http://localhost:3000/images" },
    { name: "PPT", url: "http://localhost:3000/ppts" },
    { name: "法规", url: "http://localhost:3000/laws" },
  ];

  const pageResults = [];
  for (const page of pages) {
    const result = await checkUrl(page.url);
    pageResults.push({ ...page, ...result });
    if (result.ok) {
      log(`   ✅ ${page.name}: HTTP ${result.status}`);
    } else {
      log(`   ❌ ${page.name}: ${result.error || `HTTP ${result.status}`}`);
      errors.push(`页面${page.name}: ${result.error || `HTTP ${result.status}`}`);
    }
  }

  const allPagesOk = pageResults.every(p => p.ok);
  report.website = {
    status: allPagesOk ? "ok" : "error",
    pages: pageResults.map(p => ({ name: p.name, status: p.status, ok: p.ok })),
    message: allPagesOk ? "所有页面正常" : `${pageResults.filter(p => !p.ok).length}个页面异常`,
  };

  // ═══════════════════════════════════════
  // 汇总报告
  // ═══════════════════════════════════════
  const overallStatus = errors.length === 0 ? "ok" : (errors.length <= 2 ? "warning" : "error");
  
  log("\n╔══════════════════════════════════════╗");
  log("║  维护报告                            ║");
  log("╚══════════════════════════════════════╝");
  log(`   标准: ${report.standards.message}`);
  log(`   文章: ${report.articles.message}`);
  log(`   图片: ${report.images.message}`);
  log(`   PPT:  ${report.ppts.message}`);
  log(`   网站: ${report.website.message}`);
  log(`   状态: ${overallStatus === "ok" ? "✅ 全部正常" : `⚠️ ${errors.length}个问题`}`);
  log("════════════════════════════════════════\n");

  releaseLock();
  writeHealthStatus(overallStatus, { report, errors });
}

function writeHealthStatus(status, details = {}) {
  try {
    writeFileSync(HEALTH_PATH, JSON.stringify({
      status,
      lastRun: new Date().toISOString(),
      pid: process.pid,
      ...details,
    }, null, 2));
  } catch {}
}

main().catch((err) => {
  log(`❌ 维护脚本错误: ${err.message}`);
  releaseLock();
  writeHealthStatus("crash", { errors: [err.message] });
  process.exit(1);
});
