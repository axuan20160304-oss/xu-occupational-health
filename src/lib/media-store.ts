import { promises as fs } from "node:fs";
import path from "node:path";

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  filename: string;
  thumbnail?: string;
  tags: string[];
  date: string;
  source?: string;
}

export interface MediaManifest {
  items: MediaItem[];
  updatedAt: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "content");

async function loadManifest(kind: "images" | "ppts"): Promise<MediaManifest> {
  const filePath = path.join(CONTENT_ROOT, kind, "manifest.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as MediaManifest;
    if (!Array.isArray(parsed.items)) {
      return { items: [], updatedAt: new Date().toISOString() };
    }
    return parsed;
  } catch {
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

export async function getImageList(): Promise<MediaItem[]> {
  const manifest = await loadManifest("images");
  return manifest.items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getPptList(): Promise<MediaItem[]> {
  const manifest = await loadManifest("ppts");
  return manifest.items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getImageById(id: string): Promise<MediaItem | null> {
  const items = await getImageList();
  return items.find((item) => item.id === id) ?? null;
}

export async function getPptById(id: string): Promise<MediaItem | null> {
  const items = await getPptList();
  return items.find((item) => item.id === id) ?? null;
}

export async function saveMediaManifest(
  kind: "images" | "ppts",
  items: MediaItem[],
): Promise<MediaManifest> {
  const manifest: MediaManifest = {
    items,
    updatedAt: new Date().toISOString(),
  };
  const dir = path.join(CONTENT_ROOT, kind);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  return manifest;
}
