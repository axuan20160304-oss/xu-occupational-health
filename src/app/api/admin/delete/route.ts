import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { MediaManifest } from "@/lib/media-store";

export const runtime = "nodejs";

const GITHUB_HEADERS = () => {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      }
    : null;
};

async function ghDelete(repoPath: string, commitMsg: string) {
  const headers = GITHUB_HEADERS();
  if (!headers) return;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}`;

  const checkRes = await fetch(apiUrl, { headers });
  if (!checkRes.ok) return;
  const existing = (await checkRes.json()) as { sha: string };

  await fetch(apiUrl, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: commitMsg, sha: existing.sha, branch }),
  });
}

async function ghPut(repoPath: string, content: string, commitMsg: string) {
  const headers = GITHUB_HEADERS();
  if (!headers) return;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}`;

  let sha: string | undefined;
  try {
    const checkRes = await fetch(apiUrl, { headers });
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as { sha: string };
      sha = existing.sha;
    }
  } catch { /* new file */ }

  const body: Record<string, string> = {
    message: commitMsg,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- Delete media (images / ppts) ----------
async function deleteMedia(kind: "images" | "ppts", itemId: string) {
  const manifestPath = path.join(process.cwd(), "content", kind, "manifest.json");
  const uploadSubDir = kind === "images" ? "images" : "ppts";

  let manifest: MediaManifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as MediaManifest;
  } catch {
    return { success: false, message: "manifest.json 读取失败", status: 404 };
  }

  const idx = manifest.items.findIndex((i) => i.id === itemId);
  if (idx === -1) {
    return { success: false, message: `未找到 id=${itemId} 的条目`, status: 404 };
  }

  const item = manifest.items[idx];
  manifest.items.splice(idx, 1);
  manifest.updatedAt = new Date().toISOString();
  const newManifestJson = JSON.stringify(manifest, null, 2);

  // 1) Update manifest locally
  try {
    await fs.writeFile(manifestPath, newManifestJson, "utf8");
  } catch { /* will fallback to GitHub */ }

  // 2) Delete the actual file locally
  const filePath = path.join(process.cwd(), "public", "uploads", uploadSubDir, item.filename);
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch { /* file may only exist in git */ }

  // 3) GitHub: update manifest + delete file
  try {
    await ghPut(
      `content/${kind}/manifest.json`,
      newManifestJson,
      `admin: remove ${kind}/${item.filename}`,
    );
    await ghDelete(
      `public/uploads/${uploadSubDir}/${item.filename}`,
      `admin: delete file ${uploadSubDir}/${item.filename}`,
    );
  } catch { /* non-critical */ }

  return { success: true, message: `已删除 ${kind}: ${item.title}`, status: 200 };
}

// ---------- Delete MDX content (articles / laws) ----------
async function deleteMdx(kind: string, slug: string) {
  const filePath = path.join(process.cwd(), "content", kind, `${slug}.mdx`);

  // Try local fs first
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    return { success: true, message: `已删除 ${kind}/${slug}`, status: 200 };
  } catch {
    // File not found locally, try GitHub API on Vercel
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) {
    return { success: false, message: "文件不存在或无法删除", status: 404 };
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/content/${kind}/${slug}.mdx`;

  try {
    const checkRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!checkRes.ok) {
      return { success: false, message: "文件不存在", status: 404 };
    }

    const existing = (await checkRes.json()) as { sha: string };

    const deleteRes = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `admin: delete ${kind}/${slug}`,
        sha: existing.sha,
        branch,
      }),
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      return { success: false, message: `GitHub API 删除失败: ${errText}`, status: 500 };
    }

    return { success: true, message: `已删除 ${kind}/${slug}`, status: 200 };
  } catch (err) {
    return { success: false, message: `删除失败: ${String(err)}`, status: 500 };
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as Record<string, unknown>)?.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "需要管理员权限" },
      { status: 403 },
    );
  }

  let body: { kind: string; slug: string };
  try {
    body = (await request.json()) as { kind: string; slug: string };
  } catch {
    return NextResponse.json(
      { success: false, message: "请求体必须是合法 JSON" },
      { status: 400 },
    );
  }

  const { kind, slug } = body;
  if (!kind || !slug) {
    return NextResponse.json(
      { success: false, message: "kind 和 slug 为必填项" },
      { status: 400 },
    );
  }

  const allowedKinds = ["articles", "laws", "images", "ppts"];
  if (!allowedKinds.includes(kind)) {
    return NextResponse.json(
      { success: false, message: "kind 必须是 articles、laws、images 或 ppts" },
      { status: 400 },
    );
  }

  let result: { success: boolean; message: string; status: number };

  if (kind === "images" || kind === "ppts") {
    result = await deleteMedia(kind, slug);
  } else {
    result = await deleteMdx(kind, slug);
  }

  return NextResponse.json(
    { success: result.success, message: result.message },
    { status: result.status },
  );
}
