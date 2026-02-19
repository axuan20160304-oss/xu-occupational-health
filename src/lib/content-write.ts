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

async function writeViaGitHub(
  filePath: string,
  content: string,
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) {
    throw new Error("GITHUB_TOKEN 未配置，无法通过 GitHub API 写入文件。");
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/site/${filePath}`;
  const contentBase64 = Buffer.from(content, "utf8").toString("base64");

  // Check if file already exists (to get its sha for update)
  let sha: string | undefined;
  try {
    const checkRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as { sha: string };
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist yet, that's fine
  }

  const body: Record<string, string> = {
    message: `content: auto-add ${filePath}`,
    content: contentBase64,
    branch,
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API 写入失败 (${res.status}): ${errText}`);
  }
}

async function writeViaFs(
  kind: ContentKind,
  slug: string,
  content: string,
): Promise<string> {
  const directory = path.join(process.cwd(), "content", kind);
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${slug}.mdx`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

export async function writeContentFile(
  kind: ContentKind,
  payload: UpsertContentPayload,
): Promise<{ slug: string; filePath: string }> {
  const slugInput = payload.slug ?? payload.title;
  const slug = createSlug(slugInput, kind.slice(0, -1));
  const relativePath = `content/${kind}/${slug}.mdx`;

  const frontmatter = buildFrontmatter(payload, slug);
  const body = toSafeLines(payload.content).join("\n");
  const finalContent = `${frontmatter}${body}\n`;

  // Use GitHub API on Vercel (read-only fs), fall back to local fs
  if (process.env.GITHUB_TOKEN && process.env.VERCEL) {
    await writeViaGitHub(relativePath, finalContent);
    return { slug, filePath: relativePath };
  }

  const filePath = await writeViaFs(kind, slug, finalContent);
  return { slug, filePath };
}
