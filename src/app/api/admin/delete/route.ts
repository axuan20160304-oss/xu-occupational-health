import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

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

  const allowedKinds = ["articles", "laws"];
  if (!allowedKinds.includes(kind)) {
    return NextResponse.json(
      { success: false, message: "kind 必须是 articles 或 laws" },
      { status: 400 },
    );
  }

  const filePath = path.join(process.cwd(), "content", kind, `${slug}.mdx`);

  // Try local fs first
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    return NextResponse.json({ success: true, message: `已删除 ${kind}/${slug}` });
  } catch {
    // File not found locally, try GitHub API on Vercel
  }

  // GitHub API deletion for Vercel
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) {
    return NextResponse.json(
      { success: false, message: "文件不存在或无法删除" },
      { status: 404 },
    );
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
      return NextResponse.json(
        { success: false, message: "文件不存在" },
        { status: 404 },
      );
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
      return NextResponse.json(
        { success: false, message: `GitHub API 删除失败: ${errText}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: `已删除 ${kind}/${slug}` });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `删除失败: ${String(err)}` },
      { status: 500 },
    );
  }
}
