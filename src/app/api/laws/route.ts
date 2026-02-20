import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { type UpsertContentPayload, writeContentFile } from "@/lib/content-write";
import { createSlug } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 60;

function validatePayload(payload: Partial<UpsertContentPayload>): string | null {
  if (!payload.title || payload.title.trim().length < 2) {
    return "title 为必填项，且长度至少为 2。";
  }

  if (!payload.content || payload.content.trim().length < 10) {
    return "content 为必填项，且长度至少为 10。";
  }

  return null;
}

async function downloadAndUploadPdf(
  pdfUrl: string,
  slug: string,
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "axuan20160304-oss/xu-occupational-health";
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) return null;

  try {
    const pdfRes = await fetch(pdfUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!pdfRes.ok) return null;

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    if (pdfBuffer.length < 100 || pdfBuffer.slice(0, 5).toString() !== "%PDF-") {
      return null;
    }

    const filePath = `public/uploads/${slug}.pdf`;
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const contentBase64 = pdfBuffer.toString("base64");

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
      // file doesn't exist
    }

    const body: Record<string, string> = {
      message: `upload: PDF ${slug}`,
      content: contentBase64,
      branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return `/uploads/${slug}.pdf`;
    }
  } catch {
    // download failed
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

  const slugInput = payload.slug ?? payload.title as string;
  const slug = createSlug(slugInput, "law");
  let pdfLocalUrl: string | null = null;

  if (payload.pdfUrl) {
    pdfLocalUrl = await downloadAndUploadPdf(payload.pdfUrl, slug);
  }

  const attachments = payload.attachments ?? [];
  if (pdfLocalUrl && !attachments.some((a) => a.type === "pdf")) {
    attachments.push({
      name: `${slug}.pdf`,
      url: pdfLocalUrl,
      type: "pdf",
    });
  }

  const result = await writeContentFile("laws", {
    slug: payload.slug,
    title: payload.title as string,
    summary: payload.summary,
    date: payload.date,
    tags: payload.tags,
    category: payload.category,
    author: payload.author,
    source: payload.source,
    attachments,
    content: payload.content as string,
  });

  return NextResponse.json({
    success: true,
    kind: "laws",
    slug: result.slug,
    filePath: result.filePath,
    pdfUrl: pdfLocalUrl,
  });
}
