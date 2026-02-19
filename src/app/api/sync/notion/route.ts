import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { syncNotionDatabase } from "@/lib/notion-sync";

function checkApiKey(request: NextRequest): boolean {
  const key = request.headers.get("x-api-key");
  const expected = process.env.CONTENT_API_KEY;
  if (!expected) return true;
  return key === expected;
}

export async function POST(request: NextRequest) {
  if (!checkApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json(
      { error: "NOTION_API_KEY 未配置，请在环境变量中设置" },
      { status: 500 }
    );
  }

  let body: { databaseId?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须为 JSON" }, { status: 400 });
  }

  const { databaseId, contentType } = body;

  if (!databaseId || typeof databaseId !== "string") {
    return NextResponse.json(
      { error: "缺少 databaseId 字段" },
      { status: 400 }
    );
  }

  if (contentType !== "laws" && contentType !== "articles") {
    return NextResponse.json(
      { error: "contentType 必须为 laws 或 articles" },
      { status: 400 }
    );
  }

  const contentDir = path.join(process.cwd(), "content", contentType);
  await fs.mkdir(contentDir, { recursive: true });

  const writeFile = async (slug: string, mdx: string) => {
    const filePath = path.join(contentDir, `${slug}.mdx`);
    await fs.writeFile(filePath, mdx, "utf-8");
  };

  try {
    const result = await syncNotionDatabase(
      { databaseId, contentType },
      writeFile
    );

    return NextResponse.json({
      ok: true,
      message: `同步完成：成功 ${result.synced} 条，跳过 ${result.skipped} 条`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
