#!/usr/bin/env node
/**
 * 批量下载职业卫生标准PDF
 * 从多个公开源尝试下载，保存到 ~/standards-pdfs/
 * 
 * 用法: node scripts/download-standards-pdfs.mjs [--concurrency 3] [--retry 2]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, '..', 'content', 'standards', 'standards-catalog.json');
const PDF_DIR = path.join(process.env.HOME, 'standards-pdfs');
const PROGRESS_FILE = path.join(PDF_DIR, '_download-progress.json');

// Parse CLI args
const args = process.argv.slice(2);
const CONCURRENCY = parseInt(args[args.indexOf('--concurrency') + 1]) || 3;
const MAX_RETRY = parseInt(args[args.indexOf('--retry') + 1]) || 2;
const TIMEOUT_MS = 30000;

// Ensure output directory
fs.mkdirSync(PDF_DIR, { recursive: true });

// Load catalog
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const standards = catalog.standards;

// Load progress (resume support)
let progress = {};
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch { progress = {}; }
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Download helper with timeout
function downloadUrl(url, destPath, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: timeoutMs,
      rejectUnauthorized: false,
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        downloadUrl(redirectUrl, destPath, timeoutMs).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const contentType = res.headers['content-type'] || '';
      // Accept PDF or octet-stream
      if (!contentType.includes('pdf') && !contentType.includes('octet-stream') && !contentType.includes('force-download')) {
        // Still try - some servers don't set correct content-type
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        // Validate it's actually a PDF
        if (buf.length < 100) {
          reject(new Error('File too small'));
          return;
        }
        const header = buf.slice(0, 5).toString();
        if (header !== '%PDF-') {
          reject(new Error('Not a PDF file'));
          return;
        }
        fs.writeFileSync(destPath, buf);
        resolve({ size: buf.length, path: destPath });
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// Generate search/download URLs for a standard
function getDownloadUrls(code, title) {
  const encoded = encodeURIComponent(code);
  const encodedTitle = encodeURIComponent(title);
  const codeClean = code.replace(/\//g, '-').replace(/\s+/g, '-');
  
  return [
    // Common free standard PDF sources
    `https://www.csres.com/d/${codeClean}.pdf`,
    `http://c.gb688.cn/bzgk/gb/showGb?type=online&hcno=${codeClean}`,
    `https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=${codeClean}`,
    // Direct PDF link patterns
    `https://max.book118.com/pdf/${codeClean}.pdf`,
  ];
}

// Try to download a standard's PDF from multiple sources
async function downloadStandard(std) {
  const pdfPath = path.join(PDF_DIR, std.pdfFilename);
  
  // Skip if already downloaded
  if (fs.existsSync(pdfPath)) {
    const stat = fs.statSync(pdfPath);
    if (stat.size > 100) {
      return { status: 'exists', size: stat.size };
    }
  }
  
  // Skip if previously marked as unavailable
  if (progress[std.code]?.status === 'unavailable' && progress[std.code]?.attempts >= MAX_RETRY) {
    return { status: 'skip' };
  }

  const urls = getDownloadUrls(std.code, std.title);
  
  for (const url of urls) {
    try {
      const result = await downloadUrl(url, pdfPath);
      progress[std.code] = { status: 'downloaded', size: result.size, source: url, time: new Date().toISOString() };
      return { status: 'downloaded', size: result.size, source: url };
    } catch (err) {
      // Try next source
    }
  }
  
  // All sources failed
  const attempts = (progress[std.code]?.attempts || 0) + 1;
  progress[std.code] = { status: 'unavailable', attempts, time: new Date().toISOString() };
  return { status: 'failed' };
}

// Process with concurrency control
async function processAll() {
  console.log(`\n📚 职业卫生标准PDF批量下载`);
  console.log(`   总计: ${standards.length} 条标准`);
  console.log(`   目录: ${PDF_DIR}`);
  console.log(`   并发: ${CONCURRENCY}`);
  console.log(`   重试: ${MAX_RETRY}\n`);

  let downloaded = 0, exists = 0, failed = 0, skipped = 0;
  let totalBytes = 0;
  const startTime = Date.now();
  
  // Count already existing
  for (const std of standards) {
    const pdfPath = path.join(PDF_DIR, std.pdfFilename);
    if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 100) {
      exists++;
    }
  }
  
  if (exists > 0) {
    console.log(`   已有: ${exists} 个PDF（跳过）\n`);
  }

  // Process in batches
  const pending = standards.filter(s => {
    const pdfPath = path.join(PDF_DIR, s.pdfFilename);
    return !fs.existsSync(pdfPath) || fs.statSync(pdfPath).size <= 100;
  });

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(std => downloadStandard(std))
    );

    for (let j = 0; j < results.length; j++) {
      const std = batch[j];
      const result = results[j];
      
      if (result.status === 'fulfilled') {
        const r = result.value;
        if (r.status === 'downloaded') {
          downloaded++;
          totalBytes += r.size;
          console.log(`  ✅ [${i + j + 1}/${pending.length}] ${std.code} - ${(r.size / 1024).toFixed(0)}KB`);
        } else if (r.status === 'exists') {
          exists++;
        } else if (r.status === 'skip') {
          skipped++;
        } else {
          failed++;
          console.log(`  ❌ [${i + j + 1}/${pending.length}] ${std.code} - 未找到`);
        }
      } else {
        failed++;
        console.log(`  ❌ [${i + j + 1}/${pending.length}] ${batch[j].code} - ${result.reason?.message || '错误'}`);
      }
    }
    
    // Save progress periodically
    if (i % 30 === 0) saveProgress();
  }

  saveProgress();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 下载完成统计`);
  console.log(`   新下载: ${downloaded} 个 (${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`   已存在: ${exists} 个`);
  console.log(`   失败:   ${failed} 个`);
  console.log(`   跳过:   ${skipped} 个`);
  console.log(`   耗时:   ${elapsed}s`);
  console.log(`${'='.repeat(50)}\n`);

  // Generate summary report
  const report = {
    timestamp: new Date().toISOString(),
    total: standards.length,
    downloaded,
    exists,
    failed,
    skipped,
    totalBytes,
    elapsed: parseFloat(elapsed),
  };
  fs.writeFileSync(path.join(PDF_DIR, '_download-report.json'), JSON.stringify(report, null, 2));
}

processAll().catch(console.error);
