import { SectionTitle } from "@/components/ui/section-title";
import { ImageGallery } from "@/components/media/image-gallery";
import { getImageList } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  const images = await getImageList();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Image Library"
        title="图片资料库"
        description="职业健康相关图片资料，支持在线预览与高清下载。由 NotebookLM 与 OpenClaw 协同生成。"
      />

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        共 {images.length} 张图片
      </p>

      <ImageGallery images={images} />

      {images.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
          暂无图片资料，可通过 OpenClaw 从 NotebookLM 生成并上传。
        </div>
      )}
    </div>
  );
}
