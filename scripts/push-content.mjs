#!/usr/bin/env node
/**
 * 快捷内容推送脚本 — 配合 OpenClaw / Telegram 机器人使用
 *
 * 使用方式：
 *
 * 1. 在 Telegram 中告诉 OpenClaw 机器人你要发布的内容
 * 2. 让机器人生成 JSON 格式的内容数据
 * 3. 将 JSON 保存为文件，然后运行本脚本推送
 *
 * 用法：
 *   # 推送法规
 *   node scripts/push-content.mjs laws '{"title":"法规标题","summary":"摘要","category":"国家法律","tags":["标签"],"content":"## 正文"}'
 *
 *   # 推送文章
 *   node scripts/push-content.mjs articles '{"title":"文章标题","summary":"摘要","category":"案例分析","tags":["标签"],"content":"## 正文"}'
 *
 *   # 从文件推送
 *   node scripts/push-content.mjs laws < content.json
 *
 * 环境变量：
 *   SITE_URL        - 网站地址（默认 http://localhost:3001）
 *   CONTENT_API_KEY - 网站 API 密钥
 */

const SITE_URL = process.env.SITE_URL || "http://localhost:3001";
const API_KEY = process.env.CONTENT_API_KEY || "";

async function pushContent(type, data) {
  const endpoint = `${SITE_URL}/api/${type}`;
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  console.log(`\n📤 推送到 ${endpoint}`);
  console.log(`   标题: ${data.title}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (result.success) {
    console.log(`   ✅ 成功！slug: ${result.slug}`);
    console.log(`   🌐 查看: ${SITE_URL}/${type}/${result.slug}`);
  } else {
    console.log(`   ❌ 失败: ${result.message || JSON.stringify(result)}`);
  }

  return result;
}

async function main() {
  const type = process.argv[2];
  const jsonArg = process.argv[3];

  if (!type || !["laws", "articles"].includes(type)) {
    console.log("用法: node scripts/push-content.mjs <laws|articles> '<JSON数据>'");
    console.log("");
    console.log("示例:");
    console.log('  node scripts/push-content.mjs laws \'{"title":"法规标题","summary":"摘要","category":"国家法律","tags":["标签"],"content":"## 正文内容"}\'');
    console.log('  node scripts/push-content.mjs articles \'{"title":"文章标题","summary":"摘要","category":"案例分析","tags":["标签"],"content":"## 正文内容"}\'');
    console.log("");
    console.log("💡 提示：在 Telegram 中让 OpenClaw 机器人帮你生成 JSON 数据，然后粘贴到这里");
    process.exit(1);
  }

  let data;

  if (jsonArg) {
    // 从命令行参数读取 JSON
    try {
      data = JSON.parse(jsonArg);
    } catch (err) {
      console.error("❌ JSON 解析失败:", err.message);
      console.error("   请确保 JSON 格式正确，用单引号包裹整个 JSON 字符串");
      process.exit(1);
    }
  } else {
    // 从 stdin 读取 JSON（支持管道输入）
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks).toString("utf-8").trim();
    if (!input) {
      console.error("❌ 未提供内容数据，请通过参数或管道输入 JSON");
      process.exit(1);
    }
    try {
      data = JSON.parse(input);
    } catch (err) {
      console.error("❌ stdin JSON 解析失败:", err.message);
      process.exit(1);
    }
  }

  if (!data.title || !data.content) {
    console.error("❌ JSON 必须包含 title 和 content 字段");
    process.exit(1);
  }

  console.log("=== 内容推送 ===");
  console.log(`类型: ${type === "laws" ? "法规" : "文章"}`);
  console.log(`网站: ${SITE_URL}`);

  await pushContent(type, data);
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
