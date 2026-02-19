import { ContentCard } from "@/components/content/content-card";
import { FilterForm } from "@/components/search/filter-form";
import { SectionTitle } from "@/components/ui/section-title";
import { getAllTags, getContentList } from "@/lib/content";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickStringParam(
  value: string | string[] | undefined,
  fallback = "",
): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function LawsPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const keyword = pickStringParam(params.q).trim().toLowerCase();
  const tag = pickStringParam(params.tag).trim();

  const [laws, tags] = await Promise.all([
    getContentList("laws"),
    getAllTags("laws"),
  ]);

  const filtered = laws.filter((item) => {
    const byTag = !tag || item.tags.includes(tag);

    if (!byTag) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [item.title, item.summary, item.category, item.tags.join(" ")]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Laws & Regulations"
        title="职业病法律法规"
        description="持续更新国家法律、行政法规、标准规范与政策解读。支持 API 自动同步。"
      />

      <FilterForm defaultKeyword={keyword} defaultTag={tag} availableTags={tags} />

      <p className="mt-4 text-sm text-[var(--text-muted)]">
        当前结果：{filtered.length} 条（共 {laws.length} 条）
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <ContentCard key={item.slug} item={item} basePath="/laws" />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
          未匹配到法规内容，请调整关键词或标签。
        </div>
      ) : null}
    </div>
  );
}
