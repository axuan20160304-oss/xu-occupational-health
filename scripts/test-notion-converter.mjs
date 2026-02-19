/**
 * 单元测试：验证 Notion 内容转换逻辑（不需要真实 Notion API Key）
 * 用法：node scripts/test-notion-converter.mjs
 */

// 模拟 Notion 页面数据（与真实 API 返回格式一致）
const mockPage = {
  id: "abc123",
  properties: {
    标题: {
      type: "title",
      title: [{ plain_text: "噪声作业健康监护测试文章" }],
    },
    摘要: {
      type: "rich_text",
      rich_text: [{ plain_text: "这是一篇测试文章的摘要内容。" }],
    },
    分类: {
      type: "select",
      select: { name: "案例分析" },
    },
    标签: {
      type: "multi_select",
      multi_select: [{ name: "噪声" }, { name: "职业性噪声聋" }],
    },
    日期: {
      type: "date",
      date: { start: "2026-02-19" },
    },
    状态: {
      type: "select",
      select: { name: "已发布" },
    },
  },
};

// 模拟 Notion blocks 数据
const mockBlocks = [
  {
    type: "heading_2",
    heading_2: { rich_text: [{ plain_text: "一、背景介绍" }] },
  },
  {
    type: "paragraph",
    paragraph: {
      rich_text: [{ plain_text: "本文介绍噪声作业健康监护的相关内容。" }],
    },
  },
  {
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [{ plain_text: "纯音测听检查" }] },
  },
  {
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [{ plain_text: "耳科专科检查" }] },
  },
  {
    type: "heading_2",
    heading_2: { rich_text: [{ plain_text: "二、处置建议" }] },
  },
  {
    type: "quote",
    quote: {
      rich_text: [{ plain_text: "听力损失超过 40dB 应暂停噪声作业。" }],
    },
  },
];

// 内联实现转换逻辑（与 notion-sync.ts 保持一致）
function richTextToString(richText) {
  return richText.map((t) => t.plain_text).join("");
}

function slugify(text, fallback) {
  const ascii = text
    .toLowerCase()
    .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (ascii) return ascii;
  if (fallback) return fallback.replace(/[^a-z0-9]/gi, "").slice(0, 32);
  return `post-${Date.now()}`;
}

function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        lines.push(richTextToString(block.paragraph.rich_text) || "");
        break;
      case "heading_1":
        lines.push(`# ${richTextToString(block.heading_1.rich_text)}`);
        break;
      case "heading_2":
        lines.push(`## ${richTextToString(block.heading_2.rich_text)}`);
        break;
      case "heading_3":
        lines.push(`### ${richTextToString(block.heading_3.rich_text)}`);
        break;
      case "bulleted_list_item":
        lines.push(`- ${richTextToString(block.bulleted_list_item.rich_text)}`);
        break;
      case "numbered_list_item":
        lines.push(`1. ${richTextToString(block.numbered_list_item.rich_text)}`);
        break;
      case "quote":
        lines.push(`> ${richTextToString(block.quote.rich_text)}`);
        break;
      default:
        break;
    }
  }
  return lines.join("\n\n");
}

function extractPageMeta(page) {
  const props = page.properties;

  const titleProp = props["标题"] ?? props["Title"] ?? props["title"];
  const title =
    titleProp?.type === "title" ? richTextToString(titleProp.title) : "无标题";

  const summaryProp = props["摘要"] ?? props["Summary"] ?? props["summary"];
  const summary =
    summaryProp?.type === "rich_text"
      ? richTextToString(summaryProp.rich_text)
      : "";

  const categoryProp = props["分类"] ?? props["Category"] ?? props["category"];
  const category =
    categoryProp?.type === "select"
      ? (categoryProp.select?.name ?? "未分类")
      : "未分类";

  const tagsProp = props["标签"] ?? props["Tags"] ?? props["tags"];
  const tags =
    tagsProp?.type === "multi_select"
      ? tagsProp.multi_select.map((t) => t.name)
      : [];

  const dateProp = props["日期"] ?? props["Date"] ?? props["date"];
  const date =
    dateProp?.type === "date"
      ? (dateProp.date?.start ?? new Date().toISOString().slice(0, 10))
      : new Date().toISOString().slice(0, 10);

  return { title, summary, category, tags, date };
}

function buildMdx(meta, body) {
  const tagsYaml =
    meta.tags.length > 0
      ? `tags:\n${meta.tags.map((t) => `  - ${t}`).join("\n")}`
      : "tags: []";

  return `---
title: "${meta.title.replace(/"/g, '\\"')}"
date: "${meta.date}"
category: "${meta.category}"
summary: "${meta.summary.replace(/"/g, '\\"')}"
${tagsYaml}
---

${body}
`;
}

// 执行测试
console.log("=== Notion 内容转换器单元测试 ===\n");

const meta = extractPageMeta(mockPage);
const body = blocksToMarkdown(mockBlocks);
const slug = slugify(meta.title, mockPage.id);
const mdx = buildMdx(meta, body);

console.log("【提取的元数据】");
console.log(`  标题: ${meta.title}`);
console.log(`  摘要: ${meta.summary}`);
console.log(`  分类: ${meta.category}`);
console.log(`  标签: ${meta.tags.join(", ")}`);
console.log(`  日期: ${meta.date}`);
console.log(`  生成 slug: ${slug}`);

console.log("\n【生成的 MDX 内容】");
console.log("─".repeat(50));
console.log(mdx);
console.log("─".repeat(50));

// 验证
const checks = [
  ["标题提取正确", meta.title === "噪声作业健康监护测试文章"],
  ["摘要提取正确", meta.summary === "这是一篇测试文章的摘要内容。"],
  ["分类提取正确", meta.category === "案例分析"],
  ["标签提取正确", meta.tags.length === 2 && meta.tags[0] === "噪声"],
  ["日期提取正确", meta.date === "2026-02-19"],
  ["slug 生成正确", slug.length > 0 && !slug.includes(" ")],
  ["MDX 包含 frontmatter", mdx.startsWith("---")],
  ["MDX 包含标题字段", mdx.includes("title:")],
  ["MDX 包含正文标题", mdx.includes("## 一、背景介绍")],
  ["MDX 包含列表项", mdx.includes("- 纯音测听检查")],
  ["MDX 包含引用块", mdx.includes("> 听力损失超过")],
];

console.log("\n【验证结果】");
let passed = 0;
for (const [name, result] of checks) {
  console.log(`  ${result ? "✅" : "❌"} ${name}`);
  if (result) passed++;
}

console.log(`\n总计：${passed}/${checks.length} 项通过`);
if (passed === checks.length) {
  console.log("🎉 所有测试通过！Notion 内容转换逻辑正确。");
} else {
  console.log("⚠️  部分测试未通过，请检查转换逻辑。");
  process.exit(1);
}
