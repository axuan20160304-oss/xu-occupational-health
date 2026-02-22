import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { saveMediaManifest, getImageList, getPptList, type MediaItem } from "@/lib/media-store";

export const runtime = "nodejs";

interface MediaPayload {
  fileName: string;
  fileData: string;
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
  kind?: "images" | "ppts";
}

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const replaced = trimmed
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!replaced) {
    return `upload-${Date.now()}.bin`;
  }

  return replaced;
}

function decodeBase64Payload(raw: string): Buffer {
  const normalized = raw.includes(",") ? raw.split(",").at(-1) ?? "" : raw;
  return Buffer.from(normalized, "base64");
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  let payload: Partial<MediaPayload>;
  try {
    payload = (await request.json()) as Partial<MediaPayload>;
  } catch {
    return NextResponse.json(
      { success: false, message: "请求体必须是合法 JSON。" },
      { status: 400 },
    );
  }

  if (!payload.fileName || typeof payload.fileName !== "string") {
    return NextResponse.json(
      { success: false, message: "fileName 为必填字符串。" },
      { status: 400 },
    );
  }

  if (!payload.fileData || typeof payload.fileData !== "string") {
    return NextResponse.json(
      { success: false, message: "fileData 为必填 Base64 字符串。" },
      { status: 400 },
    );
  }

  const safeName = sanitizeFileName(payload.fileName);
  const fileBuffer = decodeBase64Payload(payload.fileData);

  if (fileBuffer.length === 0) {
    return NextResponse.json(
      { success: false, message: "fileData 解码后为空。" },
      { status: 400 },
    );
  }

  if (fileBuffer.length > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      {
        success: false,
        message: `文件体积超过限制（${MAX_MEDIA_BYTES / (1024 * 1024)}MB）。`,
      },
      { status: 413 },
    );
  }

  const kind = payload.kind || (safeName.match(/\.pptx?$/i) ? "ppts" : "images");
  const subDir = kind === "ppts" ? "ppts" : "images";
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", subDir);
  await fs.mkdir(uploadDirectory, { recursive: true });

  const finalName = safeName;
  const targetPath = path.join(uploadDirectory, finalName);

  await fs.writeFile(targetPath, fileBuffer);

  // Auto-update manifest if metadata provided
  if (payload.title) {
    const existing = kind === "ppts" ? await getPptList() : await getImageList();
    const newItem: MediaItem = {
      id: `openclaw-${Date.now().toString(36)}`,
      title: payload.title,
      description: payload.description || "",
      filename: finalName,
      tags: payload.tags || [],
      date: new Date().toISOString().slice(0, 10),
      source: payload.source || "OpenClaw",
    };
    // Avoid duplicates by filename
    const items = existing.filter(i => i.filename !== finalName);
    items.unshift(newItem);
    await saveMediaManifest(kind, items);
  }

  return NextResponse.json({
    success: true,
    fileName: finalName,
    url: `/uploads/${subDir}/${finalName}`,
    bytes: fileBuffer.length,
  });
}
