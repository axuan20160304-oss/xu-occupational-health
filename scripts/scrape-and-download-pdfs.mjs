#!/usr/bin/env node
/**
 * 从职业病网(zybw.com)爬取GBZ标准PDF链接并批量下载
 * 使用curl子进程确保兼容性
 * 
 * 用法: node scripts/scrape-and-download-pdfs.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const PDF_DIR = path.join(process.env.HOME, 'standards-pdfs');
const LINKS_FILE = path.join(PDF_DIR, '_pdf-links.json');
const PROGRESS_FILE = path.join(PDF_DIR, '_scrape-progress.json');

fs.mkdirSync(PDF_DIR, { recursive: true });

// Use curl for reliable page fetching (handles encoding/redirects better)
function curlFetch(url) {
  try {
    return execSync(`curl -sL --max-time 20 "${url}"`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
  } catch {
    return '';
  }
}

function downloadFile(url, dest, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Referer': 'https://news.zybw.com/',
      },
      timeout,
      rejectUnauthorized: false,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redir = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        downloadFile(redir, dest, timeout).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 500) { reject(new Error('Too small')); return; }
        const hdr = buf.slice(0, 5).toString();
        if (hdr !== '%PDF-') { reject(new Error('Not PDF')); return; }
        fs.writeFileSync(dest, buf);
        resolve(buf.length);
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ========== Step 1: Scrape listing pages ==========
function scrapeListingPages() {
  console.log('\n📋 Step 1: 爬取标准列表页...');
  const allArticleUrls = new Set();
  const totalPages = 66;

  for (let page = 1; page <= totalPages; page++) {
    const url = page === 1
      ? 'https://news.zybw.com/flfg/bz/'
      : `https://news.zybw.com/flfg/bz?page=${page}`;

    const html = curlFetch(url);
    if (!html) {
      console.log(`  ⚠️ 第${page}页失败`);
      continue;
    }
    // Extract article URLs - match both relative and absolute
    const matches = [
      ...html.matchAll(/href="(https?:\/\/news\.zybw\.com\/flfg\/bz\/(\d+)\.html)"/g),
      ...html.matchAll(/href="(\/flfg\/bz\/(\d+)\.html)"/g),
    ];
    for (const m of matches) {
      const fullUrl = m[1].startsWith('http') ? m[1] : `https://news.zybw.com${m[1]}`;
      allArticleUrls.add(fullUrl);
    }
    process.stdout.write(`  [${page}/${totalPages}] 累计 ${allArticleUrls.size} 个页面\r`);
  }

  console.log(`\n  ✅ 共找到 ${allArticleUrls.size} 个标准页面\n`);
  return [...allArticleUrls];
}

// ========== Step 2: Extract PDF links from article pages ==========
function extractPdfLinks(articleUrls) {
  console.log('🔍 Step 2: 提取PDF下载链接...');
  const pdfLinks = [];
  let withPdfCount = 0;

  for (let i = 0; i < articleUrls.length; i++) {
    const articleUrl = articleUrls[i];
    const html = curlFetch(articleUrl);
    if (!html) continue;
    
    // Extract title - skip site logo h1, get article title h1
    const allH1 = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)];
    // Find h1 that is NOT the site logo (doesn't have class="site_logo" and isn't just "职业病网")
    const articleH1 = allH1.find(m => {
      const full = m[0];
      const text = m[1].replace(/<[^>]*>/g, '').trim();
      return !full.includes('site_logo') && text !== '职业病网' && text.length > 3;
    });
    const title = articleH1 ? articleH1[1].replace(/<[^>]*>/g, '').trim() : '';
    
    // Also try <title> tag as fallback
    const titleTagMatch = html.match(/<title[^>]*>(.*?)<\/title>/s);
    const pageTitle = titleTagMatch ? titleTagMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    const bestTitle = title || pageTitle;
    
    // Extract standard code from title or page content
    const codeSource = bestTitle + ' ' + html.slice(0, 5000);
    const codeMatch = codeSource.match(/(GBZ\/T[\s]*[\d.]+[\s]*[-—][\s]*\d{4})/i)
      || codeSource.match(/(GBZ[\s]*[\d.]+[\s]*[-—][\s]*\d{4})/i)
      || codeSource.match(/(WS\/T[\s]*[\d.]+[\s]*[-—][\s]*\d{4})/i)
      || codeSource.match(/(WS[\s]*[\d.]+[\s]*[-—][\s]*\d{4})/i)
      || codeSource.match(/(AQ[\s]*[\d.]+[\s]*[-—][\s]*\d{4})/i)
      || codeSource.match(/(GB[\s]*[\d.]+[\s]*[-—][\s]*\d{4})/i);
    const code = codeMatch ? codeMatch[1].replace('—', '-').replace(/\s+/g, ' ').trim() : '';
    
    // Extract ALL download links (PDF/DOC)
    const pdfUrls = [];
    const allHrefMatches = html.matchAll(/href="([^"]*\.(pdf|PDF|doc|DOC|docx|DOCX))"/gi);
    for (const m of allHrefMatches) {
      let u = m[1];
      if (u.startsWith('/')) u = 'http://www.zybw.com' + u;
      if (u.startsWith('http')) pdfUrls.push(u);
    }

    if (code || pdfUrls.length > 0) {
      pdfLinks.push({ title: bestTitle, code, articleUrl, pdfUrls: [...new Set(pdfUrls)] });
      if (pdfUrls.length > 0) withPdfCount++;
    }
    
    if ((i + 1) % 10 === 0 || i === articleUrls.length - 1) {
      process.stdout.write(`  [${i + 1}/${articleUrls.length}] 标准: ${pdfLinks.length} | 有PDF: ${withPdfCount}\r`);
    }
  }

  console.log(`\n  ✅ 找到 ${withPdfCount} 个有PDF链接的标准 (共 ${pdfLinks.length} 个标准)\n`);
  
  // Save links for future reference
  fs.writeFileSync(LINKS_FILE, JSON.stringify(pdfLinks, null, 2));
  return pdfLinks;
}

// ========== Step 3: Download PDFs ==========
async function downloadPdfs(pdfLinks) {
  console.log('📥 Step 3: 下载PDF文件...');
  
  let downloaded = 0, failed = 0, skipped = 0, totalBytes = 0;
  const BATCH = 3;

  const toDownload = pdfLinks.filter(p => p.pdfUrls && p.pdfUrls.some(u => /\.pdf$/i.test(u)));

  for (let i = 0; i < toDownload.length; i += BATCH) {
    const batch = toDownload.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        // Generate unique filename from code, title, or article URL
        let nameBase;
        if (item.code) {
          nameBase = item.code.replace(/\//g, '-').replace(/\s+/g, '-');
        } else if (item.title && item.title.length > 5) {
          nameBase = item.title.replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(0, 80);
        } else {
          // Use article URL ID as fallback
          const urlId = item.articleUrl.match(/\/(\d+)\.html/)?.[1] || Date.now();
          nameBase = `standard-${urlId}`;
        }
        const filename = `${nameBase}.pdf`;
        const destPath = path.join(PDF_DIR, filename);

        // Skip if already exists
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
          return { status: 'exists', code: item.code || item.title };
        }

        // Try PDF URLs only
        const pdfOnly = item.pdfUrls.filter(u => /\.pdf$/i.test(u));
        for (const pdfUrl of pdfOnly) {
          try {
            const size = await downloadFile(pdfUrl, destPath);
            return { status: 'ok', code: item.code || item.title, size, filename };
          } catch {
            // try next
          }
        }
        return { status: 'failed', code: item.code || item.title };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const v = r.value;
        if (v.status === 'ok') {
          downloaded++;
          totalBytes += v.size;
          console.log(`  ✅ ${v.code} → ${v.filename} (${(v.size/1024).toFixed(0)}KB)`);
        } else if (v.status === 'exists') {
          skipped++;
        } else {
          failed++;
        }
      }
    }
    await sleep(300);
    
    if ((i + BATCH) % 30 === 0) {
      console.log(`  --- 进度: ${downloaded} 下载 / ${skipped} 跳过 / ${failed} 失败 ---`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 下载统计`);
  console.log(`   新下载: ${downloaded} (${(totalBytes/1024/1024).toFixed(1)} MB)`);
  console.log(`   已存在: ${skipped}`);
  console.log(`   失败: ${failed}`);
  console.log(`   无PDF链接: ${pdfLinks.length - toDownload.length}`);
  console.log(`${'='.repeat(50)}\n`);

  // Save progress
  const progress = { timestamp: new Date().toISOString(), downloaded, skipped, failed, totalBytes, noPdf: pdfLinks.length - toDownload.length };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ========== Main ==========
async function main() {
  console.log('🚀 职业卫生标准PDF爬取与下载工具');
  console.log(`   目标目录: ${PDF_DIR}\n`);

  // Check if we have cached links
  let pdfLinks;
  if (fs.existsSync(LINKS_FILE)) {
    console.log('📂 发现已缓存的链接文件，跳过爬取步骤...');
    pdfLinks = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
    console.log(`   已加载 ${pdfLinks.length} 条记录\n`);
  } else {
    const articleUrls = scrapeListingPages();
    pdfLinks = extractPdfLinks(articleUrls);
  }

  await downloadPdfs(pdfLinks);
  
  // Summary of what's in the PDF directory
  const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf') || f.endsWith('.PDF'));
  const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(PDF_DIR, f)).size, 0);
  console.log(`\n📁 PDF目录: ${PDF_DIR}`);
  console.log(`   文件数: ${files.length}`);
  console.log(`   总大小: ${(totalSize/1024/1024).toFixed(1)} MB\n`);
}

main().catch(err => {
  console.error('❌ 致命错误:', err.message);
  process.exit(1);
});
