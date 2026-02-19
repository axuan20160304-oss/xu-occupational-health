import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type ContentAttachment,
  type ContentKind,
  createSlug,
} from "@/lib/content";

export interface UpsertContentPayload {
  slug?: string;
  title: string;
  summary?: string;
  date?: string;
  tags?: string[];
  category?: string;
  author?: string;
  source?: string;
  attachments?: ContentAttachment[];
  content: string;
}

function sanitizeYamlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toSafeLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trimEnd());
}

function buildFrontmatter(payload: UpsertContentPayload, slug: string): string {
  const date = payload.date ?? new Date().toISOString().slice(0, 10);
  const tags = payload.tags?.filter(Boolean) ?? [];
  const attachments = payload.attachments ?? [];

  const lines: string[] = [
    "---",
    `slug: \"${sanitizeYamlString(slug)}\"`,
    `title: \"${sanitizeYamlString(payload.title)}\"`,
    `summary: \"${sanitizeYamlString(payload.summary ?? "")}\"`,
    `date: \"${sanitizeYamlString(date)}\"`,
    `category: \"${sanitizeYamlString(payload.category ?? "未分类")}\"`,
  ];

  if (payload.author) {
    lines.push(`author: \"${sanitizeYamlString(payload.author)}\"`);
  }

  if (payload.source) {
    lines.push(`source: \"${sanitizeYamlString(payload.source)}\"`);
  }

  lines.push("tags:");
  if (tags.length === 0) {
    lines.push("  - \"无标签\"");
  } else {
    for (const tag of tags) {
      lines.push(`  - \"${sanitizeYamlString(tag)}\"`);
    }
  }

  if (attachments.length === 0) {
    lines.push("attachments: []");
  } else {
    lines.push("attachments:");
    for (const attachment of attachments) {
      lines.push(`  - name: \"${sanitizeYamlString(attachment.name)}\"`);
      lines.push(`    url: \"${sanitizeYamlString(attachment.url)}\"`);
      lines.push(`    type: \"${sanitizeYamlString(attachment.type)}\"`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

export async function writeContentFile(
  kind: ContentKind,
  payload: UpsertContentPayload,
): Promise<{ slug: string; filePath: string }> {
  const directory = path.join(process.cwd(), "content", kind);
  await fs.mkdir(directory, { recursive: true });

  const slugInput = payload.slug ?? payload.title;
  const slug = createSlug(slugInput, kind.slice(0, -1));
  const filePath = path.join(directory, `${slug}.mdx`);

  const frontmatter = buildFrontmatter(payload, slug);
  const body = toSafeLines(payload.content).join("\n");
  const finalContent = `${frontmatter}${body}\n`;

  await fs.writeFile(filePath, finalContent, "utf8");

  return { slug, filePath };
}
