/**
 * 测试脚本：模拟 Notion 同步 API 调用
 * 用法：node scripts/test-notion-sync.mjs
 *
 * 如果已配置真实 NOTION_API_KEY，可以传入真实 databaseId 进行测试。
 * 否则脚本会测试 API 端点的验证逻辑。
 */

const BASE_URL = "http://localhost:3001";
const API_KEY = process.env.CONTENT_API_KEY ?? "";
const NOTION_KEY = process.env.NOTION_API_KEY ?? "";

async function post(path, body) {
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

console.log("=== Notion Sync API 测试 ===\n");

// 测试 1：缺少 NOTION_API_KEY 时的错误提示
if (!NOTION_KEY) {
  console.log("【测试 1】未配置 NOTION_API_KEY → 期望返回 500 错误");
  const r = await post("/api/sync/notion", {
    databaseId: "fake-db-id",
    contentType: "articles",
  });
  console.log(`  状态码: ${r.status}`);
  console.log(`  响应: ${JSON.stringify(r.json)}`);
  console.log(
    `  结果: ${r.status === 500 && r.json.error?.includes("NOTION_API_KEY") ? "✅ 通过" : "❌ 失败"}\n`
  );
}

// 测试 2：缺少 databaseId
console.log("【测试 2】缺少 databaseId → 期望返回 400 或 500");
const r2 = await post("/api/sync/notion", { contentType: "articles" });
console.log(`  状态码: ${r2.status}`);
console.log(`  响应: ${JSON.stringify(r2.json)}`);
console.log(`  结果: ${r2.status >= 400 ? "✅ 通过（返回错误）" : "❌ 失败"}\n`);

// 测试 3：contentType 非法
console.log("【测试 3】contentType 非法 → 期望返回 400 或 500");
const r3 = await post("/api/sync/notion", {
  databaseId: "fake-db-id",
  contentType: "invalid",
});
console.log(`  状态码: ${r3.status}`);
console.log(`  响应: ${JSON.stringify(r3.json)}`);
console.log(`  结果: ${r3.status >= 400 ? "✅ 通过（返回错误）" : "❌ 失败"}\n`);

// 测试 4：如果有真实 NOTION_API_KEY，测试真实同步
if (NOTION_KEY && process.argv[2]) {
  const databaseId = process.argv[2];
  const contentType = process.argv[3] ?? "articles";
  console.log(`【测试 4】真实 Notion 同步（databaseId: ${databaseId}）`);
  const r4 = await post("/api/sync/notion", { databaseId, contentType });
  console.log(`  状态码: ${r4.status}`);
  console.log(`  响应: ${JSON.stringify(r4.json, null, 2)}`);
} else if (!NOTION_KEY) {
  console.log(
    "【提示】要测试真实 Notion 同步，请先配置 NOTION_API_KEY 环境变量，然后运行："
  );
  console.log(
    "  NOTION_API_KEY=secret_xxx node scripts/test-notion-sync.mjs <databaseId> [articles|laws]"
  );
}

console.log("\n=== 测试完成 ===");
