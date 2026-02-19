import { NextRequest, NextResponse } from "next/server";

export function requireApiKey(request: NextRequest): NextResponse | null {
  const expectedApiKey = process.env.CONTENT_API_KEY;

  if (!expectedApiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "服务端未设置 CONTENT_API_KEY，请先在 .env.local 中配置该环境变量。",
      },
      { status: 500 },
    );
  }

  const incomingKey =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("apiKey");

  if (!incomingKey || incomingKey !== expectedApiKey) {
    return NextResponse.json(
      { success: false, message: "API Key 无效或缺失。" },
      { status: 401 },
    );
  }

  return null;
}
