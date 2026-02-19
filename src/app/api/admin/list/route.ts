import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getContentList } from "@/lib/content";
import type { ContentKind } from "@/lib/content";

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

  const kind = request.nextUrl.searchParams.get("kind") as ContentKind | null;
  if (!kind || !["articles", "laws"].includes(kind)) {
    return NextResponse.json(
      { success: false, message: "kind 参数必须是 articles 或 laws" },
      { status: 400 },
    );
  }

  try {
    const items = await getContentList(kind);
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
