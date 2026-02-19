import { promises as fs } from "node:fs";
import path from "node:path";
import { gbzCategories, type GbzHazard } from "@/data/gbz188";

export interface StandardsSnapshot {
  hazards: GbzHazard[];
  source: string;
  updatedAt: string;
}

const STANDARDS_FILE = path.join(
  process.cwd(),
  "content",
  "standards",
  "gbz-hazards.json",
);

const CATEGORY_SET = new Set<string>(gbzCategories);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function toHazard(record: unknown): GbzHazard | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const value = record as Record<string, unknown>;

  if (
    typeof value.code !== "string" ||
    typeof value.name !== "string" ||
    typeof value.category !== "string" ||
    !isStringArray(value.checks) ||
    typeof value.cycle !== "string" ||
    !isStringArray(value.contraindications) ||
    !isStringArray(value.targetDiseases)
  ) {
    return null;
  }

  if (!CATEGORY_SET.has(value.category)) {
    return null;
  }

  return {
    code: value.code,
    name: value.name,
    category: value.category as GbzHazard["category"],
    checks: value.checks,
    cycle: value.cycle,
    contraindications: value.contraindications,
    targetDiseases: value.targetDiseases,
  };
}

export async function loadStandardsSnapshot(): Promise<StandardsSnapshot | null> {
  try {
    const raw = await fs.readFile(STANDARDS_FILE, "utf8");
    const parsed = JSON.parse(raw) as {
      hazards?: unknown;
      source?: unknown;
      updatedAt?: unknown;
    };

    if (!Array.isArray(parsed.hazards)) {
      return null;
    }

    const hazards = parsed.hazards
      .map((item) => toHazard(item))
      .filter((item): item is GbzHazard => item !== null);

    if (hazards.length === 0) {
      return null;
    }

    const source = typeof parsed.source === "string" ? parsed.source : "api";
    const updatedAt =
      typeof parsed.updatedAt === "string"
        ? parsed.updatedAt
        : new Date().toISOString();

    return { hazards, source, updatedAt };
  } catch {
    return null;
  }
}

export async function loadStoredHazards(): Promise<GbzHazard[] | null> {
  const snapshot = await loadStandardsSnapshot();
  return snapshot?.hazards ?? null;
}

export async function saveStandardsSnapshot(
  hazards: GbzHazard[],
  source = "api",
): Promise<StandardsSnapshot> {
  const snapshot: StandardsSnapshot = {
    hazards,
    source,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(STANDARDS_FILE), { recursive: true });
  await fs.writeFile(STANDARDS_FILE, JSON.stringify(snapshot, null, 2), "utf8");

  return snapshot;
}
