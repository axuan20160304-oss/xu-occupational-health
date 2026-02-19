import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { type UpsertContentPayload, writeContentFile } from "@/lib/content-write";

export const runtime = "nodejs";

function validatePayload(payload: Partial<UpsertContentPayload>): string | null {
  if (!payload.title || payload.title.trim().length < 2) {
    return "title 为必填项，且长度至少为 2。";
  }

  if (!payload.content || payload.content.trim().length < 10) {
    return "content 为必填项，且长度至少为 10。";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  let payload: Partial<UpsertContentPayload>;
  try {
    payload = (await request.json()) as Partial<UpsertContentPayload>;
  } catch {
    return NextResponse.json(
      { success: false, message: "请求体必须是合法 JSON。" },
      { status: 400 },
    );
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json(
      { success: false, message: validationError },
      { status: 400 },
    );
  }

  const result = await writeContentFile("articles", {
    slug: payload.slug,
    title: payload.title as string,
    summary: payload.summary,
    date: payload.date,
    tags: payload.tags,
    category: payload.category,
    author: payload.author,
    source: payload.source,
    attachments: payload.attachments,
    content: payload.content as string,
  });

  return NextResponse.json({
    success: true,
    kind: "articles",
    slug: result.slug,
    filePath: result.filePath,
  });
}
