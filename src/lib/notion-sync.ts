import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

export interface NotionSyncPayload {
  databaseId: string;
  contentType: "laws" | "articles";
}

export interface NotionSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  slugs: string[];
}

function getNotionClient(): Client {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error("NOTION_API_KEY 未配置");
  return new Client({ auth: apiKey });
}

function richTextToString(richText: RichTextItemResponse[]): string {
  return richText.map((t) => t.plain_text).join("");
}

function slugify(text: string, pageId?: string): string {
  const ascii = text
    .toLowerCase()
    .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const idSuffix = pageId
    ? pageId.replace(/-/g, "").slice(-12)
    : String(Date.now()).slice(-8);

  if (ascii) return `${ascii}-${idSuffix}`;

  return `post-${idSuffix}`;
}

async function blocksToMarkdown(
  client: Client,
  blockId: string
): Promise<string> {
  const lines: string[] = [];

  const response = await client.blocks.children.list({ block_id: blockId });

  for (const block of response.results as BlockObjectResponse[]) {
    switch (block.type) {
      case "paragraph": {
        const text = richTextToString(block.paragraph.rich_text);
        lines.push(text ? text : "");
        break;
      }
      case "heading_1": {
        lines.push(`# ${richTextToString(block.heading_1.rich_text)}`);
        break;
      }
      case "heading_2": {
        lines.push(`## ${richTextToString(block.heading_2.rich_text)}`);
        break;
      }
      case "heading_3": {
        lines.push(`### ${richTextToString(block.heading_3.rich_text)}`);
        break;
      }
      case "bulleted_list_item": {
        lines.push(`- ${richTextToString(block.bulleted_list_item.rich_text)}`);
        break;
      }
      case "numbered_list_item": {
        lines.push(`1. ${richTextToString(block.numbered_list_item.rich_text)}`);
        break;
      }
      case "quote": {
        lines.push(`> ${richTextToString(block.quote.rich_text)}`);
        break;
      }
      case "code": {
        const lang = block.code.language ?? "";
        lines.push(
          `\`\`\`${lang}\n${richTextToString(block.code.rich_text)}\n\`\`\``
        );
        break;
      }
      case "divider": {
        lines.push("---");
        break;
      }
      case "callout": {
        lines.push(`> ${richTextToString(block.callout.rich_text)}`);
        break;
      }
      default:
        break;
    }
  }

  return lines.join("\n\n");
}

function extractPageMeta(page: PageObjectResponse): {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string;
} {
  const props = page.properties;

  const titleProp = props["标题"] ?? props["Title"] ?? props["title"];
  const title =
    titleProp?.type === "title"
      ? richTextToString(titleProp.title)
      : "无标题";

  const summaryProp = props["摘要"] ?? props["Summary"] ?? props["summary"];
  const summary =
    summaryProp?.type === "rich_text"
      ? richTextToString(summaryProp.rich_text)
      : "";

  const categoryProp =
    props["分类"] ?? props["Category"] ?? props["category"];
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

function buildMdx(
  meta: ReturnType<typeof extractPageMeta>,
  body: string
): string {
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

export async function syncNotionDatabase(
  payload: NotionSyncPayload,
  writeFile: (slug: string, mdx: string) => Promise<void>
): Promise<NotionSyncResult> {
  const client = getNotionClient();
  const result: NotionSyncResult = {
    synced: 0,
    skipped: 0,
    errors: [],
    slugs: [],
  };

  let cursor: string | undefined;

  do {
    const response = await client.databases.query({
      database_id: payload.databaseId,
      start_cursor: cursor,
      page_size: 50,
      filter: {
        property: "状态",
        select: { equals: "已发布" },
      },
    });

    for (const page of response.results as PageObjectResponse[]) {
      try {
        const meta = extractPageMeta(page);
        if (!meta.title || meta.title === "无标题") {
          result.skipped++;
          continue;
        }

        const body = await blocksToMarkdown(client, page.id);
        const slug = slugify(meta.title, page.id);
        const mdx = buildMdx(meta, body);

        await writeFile(slug, mdx);
        result.synced++;
        result.slugs.push(slug);
      } catch (err) {
        result.errors.push(
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    cursor = response.next_cursor ?? undefined;
  } while (cursor);

  return result;
}
