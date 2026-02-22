#!/usr/bin/env node
/**
 * 推送文章到 Notion 数据库
 * 
 * 用法: node scripts/push-article-to-notion.mjs <article-slug>
 */

import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTION_API_KEY = process.env.NOTION_API_KEY || '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';

// 从命令行参数获取文章 slug
const articleSlug = process.argv[2] || 'ionizing-radiation-occupational-health';

async function main() {
  if (!NOTION_API_KEY) {
    console.error('❌ 错误: NOTION_API_KEY 未配置');
    process.exit(1);
  }

  const client = new Client({ auth: NOTION_API_KEY });

  // 读取文章文件
  const articlePath = path.join(process.cwd(), 'content', 'articles', `${articleSlug}.mdx`);
  
  if (!fs.existsSync(articlePath)) {
    console.error(`❌ 错误: 文章文件不存在: ${articlePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(articlePath, 'utf-8');
  
  // 解析 frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    console.error('❌ 错误: 无法解析文章 frontmatter');
    process.exit(1);
  }

  const frontmatter = match[1];
  const body = match[2];
  
  // 解析 frontmatter 字段
  const titleMatch = frontmatter.match(/title:\s*"?([^"\n]+)"?/);
  const title = titleMatch ? titleMatch[1] : '无标题';
  
  const dateMatch = frontmatter.match(/date:\s*"?([^"\n]+)"?/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
  
  const categoryMatch = frontmatter.match(/category:\s*"?([^"\n]+)"?/);
  const category = categoryMatch ? categoryMatch[1] : '职业健康';
  
  const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s+-\s+[^\n]+\n?)*)/);
  const tags = tagsMatch 
    ? tagsMatch[1].split('\n').map(t => t.replace(/^\s+-\s+/, '').trim()).filter(Boolean)
    : [];
  
  const summaryMatch = frontmatter.match(/summary:\s*"?([^"\n]+)"?/);
  const summary = summaryMatch ? summaryMatch[1] : body.slice(0, 200);

  console.log(`📄 准备推送文章: ${title}`);
  console.log(`   日期: ${date}`);
  console.log(`   分类: ${category}`);
  console.log(`   标签: ${tags.join(', ')}`);

  // 搜索 Notion 数据库
  console.log('\n🔍 搜索可用的 Notion 数据库...');
  
  try {
    const searchResponse = await client.search({
      filter: { property: 'object', value: 'data_source' }
    });
    
    if (searchResponse.results.length === 0) {
      console.log('⚠️ 未找到任何 Notion 数据库');
      console.log('请在 Notion 中创建一个数据库，并设置以下属性:');
      console.log('  - 标题 (Title)');
      console.log('  - 摘要 (Rich Text)');
      console.log('  - 分类 (Select)');
      console.log('  - 标签 (Multi-select)');
      console.log('  - 日期 (Date)');
      console.log('  - 状态 (Select: 已发布/未发布)');
      console.log('\n然后将数据库 ID 添加到 .env.local:');
      console.log('NOTION_DATABASE_ID_ARTICLES=<database-id>');
      process.exit(1);
    }

    console.log(`\n找到 ${searchResponse.results.length} 个数据库:`);
    for (const db of searchResponse.results) {
      const dbInfo = await client.databases.retrieve({ database_id: db.id });
      console.log(`  - ${db.id}: ${dbInfo.title?.plain_text || 'Untitled'}`);
    }
    
    console.log('\n⚠️ 请在 .env.local 中配置 NOTION_DATABASE_ID_ARTICLES');
    console.log('可以使用上面列出的数据库 ID');
    
  } catch (error) {
    console.error('❌ 搜索数据库失败:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
