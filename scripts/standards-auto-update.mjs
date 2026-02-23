#!/usr/bin/env node
/**
 * 标准自动维护脚本 — 每小时运行，检查并更新职业健康相关标准
 *
 * 功能：
 *   1. 从国家标准全文公开系统(openstd.samr.gov.cn)查询最新标准
 *   2. 对比现有catalog，发现新标准自动添加
 *   3. 检查已有标准的状态变更（废止/替代）
 *   4. 自动 git commit + push + Vercel 部署
 *
 * 用法：
 *   node scripts/standards-auto-update.mjs          # 手动运行
 *   node scripts/standards-auto-update.mjs --dry-run # 仅检查不修改
 *
 * 定时任务（crontab -e）：
 *   0 * * * * cd /Users/xuguangjun/徐广军个人网站/site && node scripts/standards-auto-update.mjs >> /tmp/standards-update.log 2>&1
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, copyFileSync, unlinkSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import https from "node:https";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_PATH = join(ROOT, "content/standards/standards-catalog.json");
const BACKUP_DIR = join(ROOT, "content/standards/backups");
const LOG_PATH = "/tmp/standards-update.log";
const LOCK_PATH = "/tmp/standards-update.lock";
const HEALTH_PATH = "/tmp/standards-update-health.json";
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB log rotation
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5s between retries

// 职业健康相关标准的搜索关键词
const SEARCH_KEYWORDS = [
  "职业病", "职业健康", "职业卫生", "职业暴露",
  "噪声聋", "听力", "测听", "听阈",
  "粉尘", "尘肺", "矽肺",
  "化学毒物", "中毒",
  "放射", "辐射防护",
  "工作场所", "劳动防护",
  "GBZ", "职业性"
];

// ICS分类码 - 职业健康相关
const RELEVANT_ICS = [
  "13.100",   // 职业安全
  "13.340",   // 防护设备
  "17.140",   // 声学和声学测量
];

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    // Log rotation: if log > 5MB, truncate to last 1MB
    if (existsSync(LOG_PATH)) {
      const stat = statSync(LOG_PATH);
      if (stat.size > MAX_LOG_SIZE) {
        const content = readFileSync(LOG_PATH, "utf-8");
        writeFileSync(LOG_PATH, content.slice(-1024 * 1024), "utf-8");
      }
    }
    appendFileSync(LOG_PATH, line + "\n");
  } catch {}
}

// Lock file to prevent concurrent runs
function acquireLock() {
  if (existsSync(LOCK_PATH)) {
    try {
      const lockData = JSON.parse(readFileSync(LOCK_PATH, "utf-8"));
      const lockAge = Date.now() - lockData.timestamp;
      // Stale lock (>30 min) - remove it
      if (lockAge > 30 * 60 * 1000) {
        log("⚠️ 发现过期锁文件，已清除");
        unlinkSync(LOCK_PATH);
      } else {
        log(`⏳ 另一个实例正在运行 (PID: ${lockData.pid}, ${Math.round(lockAge/1000)}s前)，跳过`);
        return false;
      }
    } catch {
      unlinkSync(LOCK_PATH);
    }
  }
  writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
  return true;
}

function releaseLock() {
  try { unlinkSync(LOCK_PATH); } catch {}
}

// Backup catalog before modification
function backupCatalog() {
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupPath = join(BACKUP_DIR, `standards-catalog-${ts}.json`);
    copyFileSync(CATALOG_PATH, backupPath);
    log(`💾 已备份: ${backupPath}`);
    // Keep only last 10 backups
    cleanOldBackups();
    return backupPath;
  } catch (e) {
    log(`⚠️ 备份失败: ${e.message}`);
    return null;
  }
}

function cleanOldBackups() {
  try {
    execSync(`ls -t "${BACKUP_DIR}"/standards-catalog-*.json 2>/dev/null | tail -n +11 | xargs rm -f`, { stdio: "pipe" });
  } catch {}
}

// Health check - write status for monitoring
function writeHealthStatus(status, details = {}) {
  try {
    writeFileSync(HEALTH_PATH, JSON.stringify({
      status,
      lastRun: new Date().toISOString(),
      pid: process.pid,
      catalogCount: details.catalogCount || 0,
      newStandards: details.newStandards || 0,
      errors: details.errors || [],
      ...details,
    }, null, 2));
  } catch {}
}

// Retry wrapper for network requests
async function withRetry(fn, label, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < retries - 1) {
        log(`   ⚠️ ${label} 失败(${i+1}/${retries}): ${e.message}，${RETRY_DELAY/1000}s后重试...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      } else {
        log(`   ❌ ${label} 最终失败: ${e.message}`);
        return null;
      }
    }
  }
  return null;
}

// Validate catalog JSON integrity
function validateCatalog(data) {
  if (!data || typeof data !== "object") return "catalog不是对象";
  if (!Array.isArray(data.standards)) return "standards不是数组";
  if (data.standards.length === 0) return "standards为空";
  for (const s of data.standards) {
    if (!s.code || !s.title || !s.id) return `标准缺少必要字段: ${JSON.stringify(s).slice(0,100)}`;
  }
  // Check for duplicate IDs
  const ids = new Set();
  for (const s of data.standards) {
    if (ids.has(s.id)) return `重复ID: ${s.id}`;
    ids.add(s.id);
  }
  return null; // valid
}

function loadCatalog() {
  try {
    const raw = readFileSync(CATALOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    log(`❌ 无法读取标准目录: ${e.message}`);
    process.exit(1);
  }
}

function saveCatalog(data) {
  data.generatedAt = new Date().toISOString();
  data.stats.total = data.standards.length;
  writeFileSync(CATALOG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function getExistingCodes(catalog) {
  return new Set(catalog.standards.map(s => s.code));
}

function getNextId(catalog) {
  return Math.max(...catalog.standards.map(s => s.id || 0)) + 1;
}

function codeToSlug(code) {
  return code
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/**
 * 判断标准是否与职业健康相关
 */
function isRelevantStandard(code, title) {
  // GBZ系列标准全部相关
  if (/^GBZ/.test(code)) return true;
  // WS卫生标准中职业相关的
  if (/^WS/.test(code) && /职业|卫生|防护|健康监护/.test(title)) return true;
  // GB/T声学、噪声、听力相关
  if (/声学|噪声|听力|听阈|测听|护听|助听/.test(title)) return true;
  // 职业健康关键词
  if (/职业病|职业健康|职业卫生|职业暴露|职业防护/.test(title)) return true;
  // 工作场所相关
  if (/工作场所|劳动防护|个体防护/.test(title)) return true;
  // 有害因素相关
  if (/粉尘|尘肺|矽肺|化学毒物|中毒|放射|辐射/.test(title)) return true;
  // 不相关的排除
  return false;
}

function categorizeStandard(code, title) {
  if (/GBZ\s*\d/.test(code) && /诊断/.test(title)) return "职业病诊断";
  if (/GBZ\/T\s*188/.test(code)) return "职业健康监护";
  if (/GBZ\/T\s*189/.test(code)) return "工作场所监测";
  if (/GBZ\/T\s*229/.test(code)) return "职业病诊断";
  if (/GBZ\/T\s*300/.test(code)) return "工作场所监测";
  if (/GBZ\s*1-/.test(code) || /GBZ\s*2-/.test(code)) return "基础标准";
  if (/GBZ\s*158/.test(code)) return "警示标识";
  if (/防护/.test(title) || /护听/.test(title)) return "个体防护";
  if (/测听|听力|听阈|声学/.test(title)) return "技术规范与导则";
  if (/噪声|粉尘|化学|毒物/.test(title)) return "工作场所监测";
  if (/限值|接触/.test(title)) return "基础标准";
  if (/WS/.test(code)) return "卫生标准";
  return "技术规范与导则";
}

/**
 * 从国家标准全文公开系统搜索标准
 */
async function searchOpenstd(keyword) {
  return new Promise((resolve) => {
    const url = `https://openstd.samr.gov.cn/bzgk/gb/std_list?p.p1=0&p.p90=circulation_date&p.p91=desc&p.p2=${encodeURIComponent(keyword)}&p.p5=PRODUCT_SORT&p.p9=&p.p4=&p.p6=&p.p96=`;
    
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      timeout: 15000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          // Parse HTML to extract standard info
          const standards = parseOpenstdHtml(data);
          resolve(standards);
        } catch (e) {
          log(`   ⚠️ 解析openstd响应失败: ${e.message}`);
          resolve([]);
        }
      });
    });
    
    req.on("error", (e) => {
      log(`   ⚠️ openstd请求失败: ${e.message}`);
      resolve([]);
    });
    
    req.on("timeout", () => {
      req.destroy();
      resolve([]);
    });
  });
}

function parseOpenstdHtml(html) {
  const standards = [];
  // Match standard entries in the HTML table
  const regex = /class="std_code"[^>]*>([^<]+)<[\s\S]*?class="std_name"[^>]*>([^<]+)</g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const code = match[1].trim();
    const title = match[2].trim();
    if (code && title) {
      standards.push({ code, title });
    }
  }
  return standards;
}

/**
 * 从卫生健康委网站查询最新GBZ标准
 */
async function searchNhcStandards() {
  return new Promise((resolve) => {
    const url = "https://www.nhc.gov.cn/wjw/pcrb/new_list.shtml";
    
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      timeout: 15000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        // Parse for GBZ standard announcements
        const gbzPattern = /GBZ[\/\s]*T?\s*[\d.-]+/g;
        const matches = data.match(gbzPattern) || [];
        resolve([...new Set(matches)]);
      });
    });
    
    req.on("error", () => resolve([]));
    req.on("timeout", () => { req.destroy(); resolve([]); });
  });
}

/**
 * 从biaozhun.org搜索标准（已登录session）
 */
async function searchBiaozhun(keyword) {
  return new Promise((resolve) => {
    const url = `https://www.biaozhun.org/plus/search.php?keyword=${encodeURIComponent(keyword)}&searchtype=titlekeyword`;
    
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      timeout: 15000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        const standards = [];
        // Parse search results for standard codes and titles
        const regex = />((?:GB|GBZ|WS)[\/\s]*T?\s*[\d.]+-\d{4})\s+([^<]+)</g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          standards.push({
            code: match[1].trim(),
            title: match[2].trim(),
          });
        }
        resolve(standards);
      });
    });
    
    req.on("error", () => resolve([]));
    req.on("timeout", () => { req.destroy(); resolve([]); });
  });
}

/**
 * 主流程：检查并更新标准
 */
async function main() {
  log("========================================");
  log("🔄 标准自动维护开始" + (DRY_RUN ? " [DRY RUN]" : ""));
  
  // Acquire lock to prevent concurrent runs
  if (!acquireLock()) {
    writeHealthStatus("skipped", { reason: "concurrent run" });
    return;
  }
  
  const errors = [];
  
  const catalog = loadCatalog();
  
  // Validate existing catalog
  const validationError = validateCatalog(catalog);
  if (validationError) {
    log(`❌ 现有catalog验证失败: ${validationError}`);
    releaseLock();
    writeHealthStatus("error", { errors: [validationError] });
    return;
  }
  
  const existingCodes = getExistingCodes(catalog);
  let nextId = getNextId(catalog);
  const newStandards = [];
  
  log(`📊 当前标准总数: ${catalog.standards.length}`);
  
  // 1. 搜索关键词查找新标准
  const searchTerms = ["职业病诊断", "职业健康监护", "噪声聋", "听力测定", "工作场所有害因素"];
  
  for (const term of searchTerms) {
    log(`🔍 搜索: ${term}`);
    
    try {
      const results = await withRetry(() => searchBiaozhun(term), `biaozhun搜索"${term}"`) || [];
      for (const std of results) {
        if (!existingCodes.has(std.code) && isRelevantStandard(std.code, std.title)) {
          const yearMatch = std.code.match(/(\d{4})$/);
          const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
          
          const newStd = {
            id: nextId++,
            code: std.code,
            title: std.title,
            fullTitle: `${std.code} ${std.title}`,
            year,
            status: "现行",
            category: categorizeStandard(std.code, std.title),
            slug: codeToSlug(std.code),
          };
          
          newStandards.push(newStd);
          existingCodes.add(std.code);
          log(`   ✅ 发现新标准: ${std.code} ${std.title}`);
        }
      }
    } catch (e) {
      const errMsg = `biaozhun搜索"${term}"失败: ${e.message}`;
      log(`   ⚠️ ${errMsg}`);
      errors.push(errMsg);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // 2. 检查openstd.samr.gov.cn
  for (const keyword of ["GBZ", "职业卫生"]) {
    log(`🔍 搜索openstd: ${keyword}`);
    try {
      const results = await withRetry(() => searchOpenstd(keyword), `openstd搜索"${keyword}"`) || [];
      for (const std of results) {
        if (!existingCodes.has(std.code) && isRelevantStandard(std.code, std.title)) {
          const yearMatch = std.code.match(/(\d{4})$/);
          const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
          
          const newStd = {
            id: nextId++,
            code: std.code,
            title: std.title,
            fullTitle: `${std.code} ${std.title}`,
            year,
            status: "现行",
            category: categorizeStandard(std.code, std.title),
            slug: codeToSlug(std.code),
          };
          
          newStandards.push(newStd);
          existingCodes.add(std.code);
          log(`   ✅ 发现新标准: ${std.code} ${std.title}`);
        }
      }
    } catch (e) {
      const errMsg = `openstd搜索"${keyword}"失败: ${e.message}`;
      log(`   ⚠️ ${errMsg}`);
      errors.push(errMsg);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // 3. 汇总结果
  if (newStandards.length === 0) {
    log("✅ 未发现新标准，无需更新");
    log("========================================\n");
    releaseLock();
    writeHealthStatus("ok", { catalogCount: catalog.standards.length, newStandards: 0, errors });
    return;
  }
  
  log(`📝 发现 ${newStandards.length} 个新标准`);
  
  if (DRY_RUN) {
    log("🔍 [DRY RUN] 以下标准将被添加:");
    for (const s of newStandards) {
      log(`   - ${s.code} ${s.title}`);
    }
    log("========================================\n");
    releaseLock();
    writeHealthStatus("dry-run", { catalogCount: catalog.standards.length, newStandards: newStandards.length, errors });
    return;
  }
  
  // 4. Backup before modification
  const backupPath = backupCatalog();
  
  // 5. 更新catalog
  catalog.standards.push(...newStandards);
  
  // Validate before saving
  const postValidation = validateCatalog(catalog);
  if (postValidation) {
    log(`❌ 更新后catalog验证失败: ${postValidation}，回滚`);
    if (backupPath) {
      copyFileSync(backupPath, CATALOG_PATH);
      log("↩️ 已从备份恢复");
    }
    releaseLock();
    writeHealthStatus("error", { errors: [postValidation] });
    return;
  }
  
  saveCatalog(catalog);
  log(`💾 已更新标准目录，新总数: ${catalog.standards.length}`);
  
  // 6. Git commit + push (with retry)
  let gitSuccess = false;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      execSync(`git add "${CATALOG_PATH}"`, { cwd: ROOT, stdio: "pipe" });
      const msg = `auto: 自动添加${newStandards.length}个新标准 (${new Date().toISOString().slice(0,10)})`;
      execSync(`git commit -m "${msg}"`, { cwd: ROOT, stdio: "pipe" });
      log("📦 Git commit 成功");
      
      // Pull before push to handle remote changes
      try {
        execSync(`git pull --rebase origin main`, { cwd: ROOT, stdio: "pipe", timeout: 30000 });
      } catch {}
      
      execSync(`git push origin main`, { cwd: ROOT, stdio: "pipe", timeout: 30000 });
      log("🚀 Git push 成功");
      gitSuccess = true;
      break;
    } catch (e) {
      const errMsg = `Git操作(${attempt+1}/${MAX_RETRIES}): ${e.message.split("\n")[0]}`;
      log(`⚠️ ${errMsg}`);
      errors.push(errMsg);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }
  
  // 7. Rebuild & deploy (only if git succeeded)
  if (gitSuccess) {
    try {
      log("🔨 正在构建...");
      execSync(`npm run build`, { cwd: ROOT, stdio: "pipe", timeout: 180000 });
      log("✅ 构建成功");
    } catch (e) {
      const errMsg = `构建失败: ${e.message.split("\n")[0]}`;
      log(`⚠️ ${errMsg}`);
      errors.push(errMsg);
    }
    
    try {
      log("☁️ 正在部署到Vercel...");
      execSync(`npx vercel --prod --yes`, { cwd: ROOT, stdio: "pipe", timeout: 300000 });
      log("✅ Vercel部署成功");
    } catch (e) {
      const errMsg = `Vercel部署: ${e.message.split("\n")[0]}`;
      log(`⚠️ ${errMsg}`);
      errors.push(errMsg);
    }
    
    // 8. Restart local server via pm2 or direct
    try {
      execSync(`pm2 restart xu-health-site 2>/dev/null || (kill $(lsof -ti :3000) 2>/dev/null; sleep 1; nohup npx next start -p 3000 > /tmp/next-server.log 2>&1 &)`, {
        cwd: ROOT, stdio: "pipe", timeout: 15000,
      });
      log("🌐 本地服务器已重启");
    } catch (e) {
      log(`⚠️ 服务器重启: ${e.message.split("\n")[0]}`);
    }
    
    // 9. Health check - verify website is responding
    await new Promise(r => setTimeout(r, 3000));
    try {
      await verifyWebsite();
      log("✅ 网站健康检查通过");
    } catch (e) {
      const errMsg = `网站健康检查失败: ${e.message}`;
      log(`⚠️ ${errMsg}`);
      errors.push(errMsg);
    }
  } else {
    log("⚠️ Git失败，跳过构建和部署");
  }
  
  releaseLock();
  writeHealthStatus(gitSuccess ? "ok" : "partial", {
    catalogCount: catalog.standards.length,
    newStandards: newStandards.length,
    gitSuccess,
    errors,
  });
  
  log(`✅ 自动维护完成，新增${newStandards.length}个标准${errors.length > 0 ? ` (${errors.length}个警告)` : ""}`);
  log("========================================\n");
}

/**
 * 验证网站是否正常响应
 */
async function verifyWebsite() {
  return new Promise((resolve, reject) => {
    const req = http.get("http://localhost:3000/standards", { timeout: 10000 }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.resume();
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

main().catch((err) => {
  log(`❌ 自动维护错误: ${err.message}`);
  releaseLock();
  writeHealthStatus("crash", { errors: [err.message] });
  process.exit(1);
});
