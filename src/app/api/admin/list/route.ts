import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContentList } from "@/lib/content";
import type { ContentKind } from "@/lib/content";
import { getImageList, getPptList } from "@/lib/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as Record<string, unknown>)?.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "需要管理员权限" },
      { status: 403 },
    );
  }

  const kind = request.nextUrl.searchParams.get("kind");
  const allowedKinds = ["articles", "laws", "images", "ppts"];
  if (!kind || !allowedKinds.includes(kind)) {
    return NextResponse.json(
      { success: false, message: "kind 参数必须是 articles、laws、images 或 ppts" },
      { status: 400 },
    );
  }

  try {
    if (kind === "images" || kind === "ppts") {
      const items = kind === "images" ? await getImageList() : await getPptList();
      return NextResponse.json(
        items.map((item) => ({
          slug: item.id,
          title: item.title,
          date: item.date,
          description: item.description,
          tags: item.tags,
          filename: item.filename,
          source: item.source,
        })),
      );
    }

    const items = await getContentList(kind as ContentKind);
    return NextResponse.json(
      items.map((item) => ({
        slug: item.slug,
        title: item.title,
        date: item.date,
        category: item.category,
        tags: item.tags,
      })),
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
