/**
 * 创建 Notion 测试数据库并添加测试数据
 * 用法：NOTION_API_KEY=xxx node scripts/setup-notion-test-db.mjs
 */

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  console.log("=== 创建 Notion 测试数据库 ===\n");

  // 1. 获取工作空间中的页面作为父级
  const searchRes = await notion.search({
    filter: { property: "object", value: "page" },
    page_size: 5,
  });

  if (searchRes.results.length === 0) {
    console.error("❌ 未找到任何页面，无法创建数据库");
    process.exit(1);
  }

  // 使用第一个页面作为父级
  const parentPage = searchRes.results[0];
  const parentId = parentPage.id;
  console.log(`使用父页面 ID: ${parentId}`);

  // 2. 创建数据库
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: parentId },
    title: [{ type: "text", text: { content: "职业病网站-文章测试库" } }],
    properties: {
      标题: { title: {} },
      摘要: { rich_text: {} },
      分类: {
        select: {
          options: [
            { name: "案例分析", color: "blue" },
            { name: "实务指南", color: "green" },
            { name: "标准规范", color: "orange" },
          ],
        },
      },
      标签: {
        multi_select: {
          options: [
            { name: "噪声", color: "blue" },
            { name: "高温", color: "red" },
            { name: "GBZ188", color: "green" },
            { name: "职业健康", color: "purple" },
          ],
        },
      },
      日期: { date: {} },
      状态: {
        select: {
          options: [
            { name: "草稿", color: "gray" },
            { name: "已发布", color: "green" },
          ],
        },
      },
    },
  });

  console.log(`✅ 数据库创建成功！`);
  console.log(`   数据库 ID: ${db.id}`);
  console.log(`   URL: ${db.url}\n`);

  // 3. 添加测试文章 1（已发布）
  const page1 = await notion.pages.create({
    parent: { database_id: db.id },
    properties: {
      标题: { title: [{ text: { content: "Notion同步测试：噪声作业健康监护要点" } }] },
      摘要: { rich_text: [{ text: { content: "通过Notion同步到网站的测试文章，介绍噪声作业健康监护的关键要点。" } }] },
      分类: { select: { name: "案例分析" } },
      标签: { multi_select: [{ name: "噪声" }, { name: "职业健康" }] },
      日期: { date: { start: "2026-02-19" } },
      状态: { select: { name: "已发布" } },
    },
  });

  // 添加页面内容
  await notion.blocks.children.append({
    block_id: page1.id,
    children: [
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "一、噪声暴露健康监护概述" } }] },
      },
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: "根据GBZ 188-2014标准，噪声作业人员应定期进行纯音测听、耳科检查等项目。本文通过Notion同步到职业病专业网站，验证端到端的内容管理流程。" } }],
        },
      },
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "二、重点检查项目" } }] },
      },
      {
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ text: { content: "纯音测听（气导+骨导）" } }] },
      },
      {
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ text: { content: "耳科专科检查" } }] },
      },
      {
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [{ text: { content: "血压测量" } }] },
      },
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "三、职业禁忌证判定" } }] },
      },
      {
        type: "quote",
        quote: {
          rich_text: [{ text: { content: "双耳平均听阈≥40dB（HL）者，属于噪声作业职业禁忌证，应调离噪声作业岗位。" } }],
        },
      },
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: "此文章由Notion数据库同步生成，验证了从Notion到网站的完整内容管道。" } }],
        },
      },
    ],
  });

  console.log(`✅ 测试文章 1 创建成功（已发布）: ${page1.id}`);

  // 4. 添加测试文章 2（已发布）
  const page2 = await notion.pages.create({
    parent: { database_id: db.id },
    properties: {
      标题: { title: [{ text: { content: "Notion同步测试：高温作业防护指南" } }] },
      摘要: { rich_text: [{ text: { content: "高温作业健康监护与岗位管理的实务指南，通过Notion同步验证。" } }] },
      分类: { select: { name: "实务指南" } },
      标签: { multi_select: [{ name: "高温" }, { name: "GBZ188" }] },
      日期: { date: { start: "2026-02-18" } },
      状态: { select: { name: "已发布" } },
    },
  });

  await notion.blocks.children.append({
    block_id: page2.id,
    children: [
      {
        type: "heading_2",
        heading_2: { rich_text: [{ text: { content: "高温作业健康风险评估" } }] },
      },
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: "高温作业人员应重点关注血压、血糖、心电图等指标，结合岗位暴露情况进行综合风险评估。" } }],
        },
      },
      {
        type: "numbered_list_item",
        numbered_list_item: { rich_text: [{ text: { content: "未控制高血压：暂停高温作业" } }] },
      },
      {
        type: "numbered_list_item",
        numbered_list_item: { rich_text: [{ text: { content: "未控制糖尿病：限制高温暴露时间" } }] },
      },
      {
        type: "numbered_list_item",
        numbered_list_item: { rich_text: [{ text: { content: "癫痫病史：禁止高温作业" } }] },
      },
    ],
  });

  console.log(`✅ 测试文章 2 创建成功（已发布）: ${page2.id}`);

  // 5. 添加测试文章 3（草稿 - 不应被同步）
  const page3 = await notion.pages.create({
    parent: { database_id: db.id },
    properties: {
      标题: { title: [{ text: { content: "草稿：待完善的文章" } }] },
      摘要: { rich_text: [{ text: { content: "这是一篇草稿，不应被同步到网站。" } }] },
      分类: { select: { name: "标准规范" } },
      标签: { multi_select: [{ name: "GBZ188" }] },
      日期: { date: { start: "2026-02-17" } },
      状态: { select: { name: "草稿" } },
    },
  });

  console.log(`✅ 测试文章 3 创建成功（草稿）: ${page3.id}`);

  console.log("\n=== 数据库设置完成 ===");
  console.log(`\n📋 数据库 ID（用于同步）: ${db.id}`);
  console.log(`🔗 数据库 URL: ${db.url}`);
  console.log(`\n下一步：运行同步命令测试`);
  console.log(`curl -X POST http://localhost:3001/api/sync/notion \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "x-api-key: test-api-key-2026" \\`);
  console.log(`  -d '{"databaseId": "${db.id}", "contentType": "articles"}'`);
}

main().catch((err) => {
  console.error("❌ 错误:", err.message);
  process.exit(1);
});
