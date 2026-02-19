import { NextRequest, NextResponse } from "next/server";
import { gbzCategories, type GbzHazard } from "@/data/gbz188";
import { requireApiKey } from "@/lib/api-auth";
import { saveStandardsSnapshot } from "@/lib/standards-store";

export const runtime = "nodejs";

interface StandardsPayload {
  source?: string;
  hazards: GbzHazard[];
}

const CATEGORY_SET = new Set<string>(gbzCategories);

function validateHazard(value: unknown): value is GbzHazard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const hazard = value as Record<string, unknown>;

  return (
    typeof hazard.code === "string" &&
    typeof hazard.name === "string" &&
    typeof hazard.category === "string" &&
    CATEGORY_SET.has(hazard.category) &&
    Array.isArray(hazard.checks) &&
    hazard.checks.every((item) => typeof item === "string") &&
    typeof hazard.cycle === "string" &&
    Array.isArray(hazard.contraindications) &&
    hazard.contraindications.every((item) => typeof item === "string") &&
    Array.isArray(hazard.targetDiseases) &&
    hazard.targetDiseases.every((item) => typeof item === "string")
  );
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  let payload: Partial<StandardsPayload>;
  try {
    payload = (await request.json()) as Partial<StandardsPayload>;
  } catch {
    return NextResponse.json(
      { success: false, message: "请求体必须是合法 JSON。" },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.hazards) || payload.hazards.length === 0) {
    return NextResponse.json(
      { success: false, message: "hazards 必须是非空数组。" },
      { status: 400 },
    );
  }

  if (!payload.hazards.every((item) => validateHazard(item))) {
    return NextResponse.json(
      {
        success: false,
        message:
          "hazards 中存在无效项，请校验 code/name/category/checks/cycle/contraindications/targetDiseases 字段。",
      },
      { status: 400 },
    );
  }

  const snapshot = await saveStandardsSnapshot(
    payload.hazards,
    payload.source ?? "api",
  );

  return NextResponse.json({
    success: true,
    source: snapshot.source,
    updatedAt: snapshot.updatedAt,
    count: snapshot.hazards.length,
  });
}
