import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ContentKind = "articles" | "laws";

export type AttachmentType =
  | "image"
  | "pdf"
  | "ppt"
  | "mindmap"
  | "audio"
  | "file";

export interface ContentAttachment {
  name: string;
  url: string;
  type: AttachmentType;
}

export interface ContentMeta {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  category: string;
  author?: string;
  source?: string;
  attachments: ContentAttachment[];
}

export interface ContentDetail extends ContentMeta {
  content: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "content");

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function toAttachmentArray(value: unknown): ContentAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = toStringValue(record.name);
      const url = toStringValue(record.url);
      const rawType = toStringValue(record.type, "file");

      if (!name || !url) {
        return null;
      }

      const type = (
        ["image", "pdf", "ppt", "mindmap", "audio", "file"] as const
      ).includes(rawType as AttachmentType)
        ? (rawType as AttachmentType)
        : "file";

      return { name, url, type };
    })
    .filter((item): item is ContentAttachment => item !== null);
}

function getTimestamp(dateString: string): number {
  const value = Date.parse(dateString);
  return Number.isNaN(value) ? 0 : value;
}

async function listMarkdownFiles(kind: ContentKind): Promise<string[]> {
  const directory = path.join(CONTENT_ROOT, kind);

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter(
        (entry) => entry.isFile() && /\.(md|mdx)$/i.test(entry.name),
      )
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
}

async function readContentFile(filePath: string): Promise<ContentDetail> {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(filePath).replace(/\.mdx?$/i, "");

  return {
    slug,
    title: toStringValue(data.title, slug),
    summary: toStringValue(data.summary),
    date: toStringValue(data.date, new Date().toISOString().slice(0, 10)),
    tags: toStringArray(data.tags),
    category: toStringValue(data.category, "未分类"),
    author: toStringValue(data.author) || undefined,
    source: toStringValue(data.source) || undefined,
    attachments: toAttachmentArray(data.attachments),
    content: content.trim(),
  };
}

export async function getContentList(kind: ContentKind): Promise<ContentMeta[]> {
  const files = await listMarkdownFiles(kind);
  const records = await Promise.all(files.map((filePath) => readContentFile(filePath)));

  return records
    .map((record) => ({
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      date: record.date,
      tags: record.tags,
      category: record.category,
      author: record.author,
      source: record.source,
      attachments: record.attachments,
    }))
    .sort((a, b) => getTimestamp(b.date) - getTimestamp(a.date));
}

export async function getContentBySlug(
  kind: ContentKind,
  slug: string,
): Promise<ContentDetail | null> {
  const directory = path.join(CONTENT_ROOT, kind);
  const candidates = [
    path.join(directory, `${slug}.mdx`),
    path.join(directory, `${slug}.md`),
  ];

  for (const filePath of candidates) {
    try {
      await fs.access(filePath);
      return await readContentFile(filePath);
    } catch {
      // Continue to next candidate.
    }
  }

  return null;
}

export async function getAllTags(kind: ContentKind): Promise<string[]> {
  const records = await getContentList(kind);
  return Array.from(new Set(records.flatMap((record) => record.tags))).sort();
}

export function createSlug(input: string, prefix: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length >= 3) {
    return normalized;
  }

  return `${prefix}-${Date.now()}`;
}
