#!/usr/bin/env node
/**
 * 标准PDF自动查找下载脚本
 *
 * 扫描 content/laws/ 目录，对没有PDF附件的标准自动联网搜索原文PDF/Word，
 * 下载到 public/uploads/，并更新MDX frontmatter添加附件引用。
 *
 * 使用 curl 通过代理搜索Google，找到直链后下载。
 *
 * 用法：node scripts/auto-pdf-finder.mjs [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SITE_DIR = "/Users/xuguangjun/徐广军个人网站/site";
const CONTENT_DIR = path.join(SITE_DIR, "content", "laws");
const UPLOADS_DIR = path.join(SITE_DIR, "public", "uploads");
const PROXY = "http://127.0.0.1:7897";
const DRY_RUN = process.argv.includes("--dry-run");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/** Run curl with proxy, return stdout as string */
function curlText(url, timeoutSec = 20) {
  try {
    return execSync(
      `curl -s --max-time ${timeoutSec} -x ${PROXY} -L "${url}" ` +
        `-H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
  } catch { return ""; }
}

/** Run curl to download binary file, return true if succeeded */
function curlDownload(url, outPath, timeoutSec = 120) {
  try {
    execSync(
      `curl -s --max-time ${timeoutSec} -x ${PROXY} -L "${url}" ` +
        `-H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" ` +
        `-o "${outPath}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    );
    return fs.existsSync(outPath) && fs.statSync(outPath).size > 500;
  } catch { return false; }
}

/** Extract standard number from title */
function extractStdNumber(title) {
  const m = title.match(/(GBZ?(?:\/T)?)\s*(\d+(?:\.\d+)?(?:-\d+)?(?:-\d{4})?)/i);
  if (m) return `${m[1]} ${m[2]}`;
  const b = title.match(/(GB|GBZ|GBJ|AQ|DL|HJ|DB)\/?T?\s*\d+(?:\.\d+)?(?:-\d+)?(?:-\d{4})?/i);
  return b ? b[0] : null;
}

/** Check if file starts with %PDF- */
function isValidPdf(filePath) {
  try {
    const buf = Buffer.alloc(5);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 5, 0);
    fs.closeSync(fd);
    return buf.toString() === "%PDF-";
  } catch { return false; }
}

/** Search Google for PDF links via curl */
function googleSearchPdfUrls(query) {
  const urls = [];
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " filetype:pdf")}`;
  const html = curlText(searchUrl, 15);
  if (!html) return urls;

  // Extract URLs from Google results (href attributes)
  const hrefMatches = html.match(/href="(https?:\/\/[^"]+\.pdf[^"]*)"/gi) || [];
  for (const m of hrefMatches) {
    const url = m.replace(/^href="/i, "").replace(/"$/, "").split("&")[0];
    if (url.match(/\.pdf$/i) && !url.includes("google.com")) {
      urls.push(url);
    }
  }

  // Also extract PDF URLs from redirect links (/url?q=...)
  const redirectMatches = html.match(/\/url\?q=(https?[^&"]+\.pdf)/gi) || [];
  for (const m of redirectMatches) {
    const url = decodeURIComponent(m.replace(/^\/url\?q=/i, ""));
    if (!url.includes("google.com")) {
      urls.push(url);
    }
  }

  // Also extract any bare PDF URLs
  const bareMatches = html.match(/https?:\/\/[^\s"'<>&]+\.pdf/gi) || [];
  urls.push(...bareMatches.filter(u => !u.includes("google.com")));

  return [...new Set(urls)];
}

/** Search for a standard PDF using multiple strategies */
function searchPdfUrls(stdNumber, title) {
  const results = [];

  // Strategy 1: Google search with standard number
  if (stdNumber) {
    console.log(`  🔍 Google搜索: ${stdNumber} pdf`);
    results.push(...googleSearchPdfUrls(`${stdNumber} ${title || ""}`));
  }

  // Strategy 2: Google search with full title
  if (title && results.length < 3) {
    console.log(`  🔍 Google搜索: ${title} pdf 下载`);
    results.push(...googleSearchPdfUrls(`${title} pdf 下载`));
  }

  // Strategy 3: Try specific Chinese standard sites
  if (stdNumber) {
    const compact = stdNumber.replace(/\s+/g, "").replace(/\//g, "");
    // waizi.org.cn (verified to have GBZ standards)
    results.push(`https://www.waizi.org.cn/doc/${compact}.pdf`);
  }

  const unique = [...new Set(results)];
  console.log(`  📋 找到 ${unique.length} 个候选链接`);
  return unique;
}

/** Try to download PDF from a URL, return local path or null */
function tryDownload(url, slug) {
  console.log(`  ⬇️  尝试: ${url.substring(0, 100)}${url.length > 100 ? "..." : ""}`);

  const tmpPath = path.join(UPLOADS_DIR, `${slug}.pdf.tmp`);
  const finalPath = path.join(UPLOADS_DIR, `${slug}.pdf`);

  const ok = curlDownload(url, tmpPath);
  if (!ok) {
    try { fs.unlinkSync(tmpPath); } catch {}
    console.log(`    ❌ 下载失败或文件太小`);
    return null;
  }

  if (isValidPdf(tmpPath)) {
    const size = (fs.statSync(tmpPath).size / 1024 / 1024).toFixed(2);
    console.log(`    ✅ 有效PDF (${size} MB)`);
    if (!DRY_RUN) {
      fs.renameSync(tmpPath, finalPath);
    } else {
      fs.unlinkSync(tmpPath);
    }
    return `/uploads/${slug}.pdf`;
  }

  // Check if it's HTML (search page, not PDF)
  try {
    const head = fs.readFileSync(tmpPath, { encoding: "utf-8", flag: "r" }).substring(0, 500);
    if (head.includes("<html") || head.includes("<!DOCTYPE") || head.includes("<!doctype")) {
      console.log(`    ❌ 返回HTML页面`);
      // Try to find PDF links inside
      const full = fs.readFileSync(tmpPath, "utf-8");
      const pdfLinks = full.match(/https?:\/\/[^\s"'<>]+\.pdf/gi) || [];
      fs.unlinkSync(tmpPath);
      if (pdfLinks.length > 0 && pdfLinks[0] !== url) {
        console.log(`    🔗 发现内嵌PDF链接，重试...`);
        return tryDownload(pdfLinks[0], slug);
      }
      return null;
    }
  } catch {}

  console.log(`    ❌ 非PDF格式`);
  try { fs.unlinkSync(tmpPath); } catch {}
  return null;
}

/** Update MDX frontmatter to add attachment */
function updateMdxAttachment(filePath, downloadUrl) {
  const content = fs.readFileSync(filePath, "utf-8");
  if (content.includes('type: "pdf"')) return false;

  const fileName = path.basename(downloadUrl);
  const attachBlock = `attachments:\n  - name: "${fileName}"\n    url: "${downloadUrl}"\n    type: "pdf"`;

  let updated;
  if (content.includes("attachments: []")) {
    updated = content.replace("attachments: []", attachBlock);
  } else if (/^attachments:\s*$/m.test(content)) {
    updated = content.replace(/^attachments:\s*$/m, attachBlock);
  } else {
    // Add before closing ---
    updated = content.replace(/\n---\n/, `\n${attachBlock}\n---\n`);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, updated, "utf-8");
  }
  console.log(`    📝 已更新MDX frontmatter`);
  return true;
}

/** Main */
async function main() {
  console.log("🔎 标准PDF自动查找下载器 v2");
  console.log(`   目录: ${CONTENT_DIR}`);
  console.log(`   模式: ${DRY_RUN ? "预览" : "实际执行"}\n`);

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith(".mdx"));
  let downloaded = 0, failed = 0;

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const slug = file.replace(/\.mdx$/, "");

    console.log(`\n📄 ${file}`);

    // Skip if already has PDF in frontmatter
    if (content.includes('type: "pdf"')) {
      console.log("  ⏭️  已有PDF附件");
      continue;
    }

    // If PDF exists locally but not in frontmatter, just update
    if (fs.existsSync(path.join(UPLOADS_DIR, `${slug}.pdf`))) {
      console.log("  ⏭️  PDF已存在本地，更新frontmatter");
      if (updateMdxAttachment(filePath, `/uploads/${slug}.pdf`)) downloaded++;
      continue;
    }

    // Extract standard info
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const sourceMatch = content.match(/source:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : "";
    const source = sourceMatch ? sourceMatch[1] : "";
    const stdNum = extractStdNumber(title) || source;

    if (!stdNum && !title) {
      console.log("  ⚠️  无法提取标准信息");
      failed++;
      continue;
    }

    // Search and download
    const candidates = searchPdfUrls(stdNum, title);
    let result = null;
    for (const url of candidates) {
      result = tryDownload(url, slug);
      if (result) break;
    }

    if (result) {
      updateMdxAttachment(filePath, result);
      downloaded++;
      console.log(`  ✅ 完成!`);
    } else {
      failed++;
      console.log(`  ❌ 未找到可下载的PDF`);
    }

    // Delay between searches
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 扫描${files.length}个, 下载${downloaded}个, 失败${failed}个`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
