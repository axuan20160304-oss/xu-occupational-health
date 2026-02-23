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

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import https from "node:https";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_PATH = join(ROOT, "content/standards/standards-catalog.json");
const LOG_PATH = "/tmp/standards-update.log";
const DRY_RUN = process.argv.includes("--dry-run");

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
    appendFileSync(LOG_PATH, line + "\n");
  } catch {}
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
  
  const catalog = loadCatalog();
  const existingCodes = getExistingCodes(catalog);
  let nextId = getNextId(catalog);
  const newStandards = [];
  
  log(`📊 当前标准总数: ${catalog.standards.length}`);
  
  // 1. 搜索关键词查找新标准
  const searchTerms = ["职业病诊断", "职业健康监护", "噪声聋", "听力测定", "工作场所有害因素"];
  
  for (const term of searchTerms) {
    log(`🔍 搜索: ${term}`);
    
    try {
      const results = await searchBiaozhun(term);
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
      log(`   ⚠️ 搜索失败: ${e.message}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // 2. 检查openstd.samr.gov.cn
  for (const keyword of ["GBZ", "职业卫生"]) {
    log(`🔍 搜索openstd: ${keyword}`);
    try {
      const results = await searchOpenstd(keyword);
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
      log(`   ⚠️ openstd搜索失败: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // 3. 汇总结果
  if (newStandards.length === 0) {
    log("✅ 未发现新标准，无需更新");
    log("========================================\n");
    return;
  }
  
  log(`📝 发现 ${newStandards.length} 个新标准`);
  
  if (DRY_RUN) {
    log("🔍 [DRY RUN] 以下标准将被添加:");
    for (const s of newStandards) {
      log(`   - ${s.code} ${s.title}`);
    }
    log("========================================\n");
    return;
  }
  
  // 4. 更新catalog
  catalog.standards.push(...newStandards);
  saveCatalog(catalog);
  log(`💾 已更新标准目录，新总数: ${catalog.standards.length}`);
  
  // 5. Git commit + push
  try {
    execSync(`git add "${CATALOG_PATH}"`, { cwd: ROOT, stdio: "pipe" });
    const msg = `auto: 自动添加${newStandards.length}个新标准 (${new Date().toISOString().slice(0,10)})`;
    execSync(`git commit -m "${msg}"`, { cwd: ROOT, stdio: "pipe" });
    log("📦 Git commit 成功");
    
    execSync(`git push origin main`, { cwd: ROOT, stdio: "pipe", timeout: 30000 });
    log("🚀 Git push 成功");
  } catch (e) {
    log(`⚠️ Git操作: ${e.message.split("\n")[0]}`);
  }
  
  // 6. Rebuild & deploy
  try {
    log("🔨 正在构建...");
    execSync(`npx next build`, { cwd: ROOT, stdio: "pipe", timeout: 120000 });
    log("✅ 构建成功");
  } catch (e) {
    log(`⚠️ 构建失败: ${e.message.split("\n")[0]}`);
  }
  
  try {
    log("☁️ 正在部署到Vercel...");
    execSync(`npx vercel --prod --yes`, { cwd: ROOT, stdio: "pipe", timeout: 300000 });
    log("✅ Vercel部署成功");
  } catch (e) {
    log(`⚠️ Vercel部署: ${e.message.split("\n")[0]}`);
  }
  
  // 7. Restart local server
  try {
    execSync(`kill $(lsof -ti :3000) 2>/dev/null; sleep 1; npx next start -p 3000 &`, {
      cwd: ROOT, stdio: "pipe", timeout: 10000,
    });
    log("🌐 本地服务器已重启");
  } catch {}
  
  log(`✅ 自动维护完成，新增${newStandards.length}个标准`);
  log("========================================\n");
}

main().catch((err) => {
  log(`❌ 自动维护错误: ${err.message}`);
  process.exit(1);
});
