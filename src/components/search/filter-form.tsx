interface FilterFormProps {
  defaultKeyword?: string;
  defaultTag?: string;
  availableTags: string[];
}

export function FilterForm({
  defaultKeyword,
  defaultTag,
  availableTags,
}: FilterFormProps) {
  return (
    <form className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_200px_auto]">
      <input
        type="search"
        name="q"
        defaultValue={defaultKeyword}
        placeholder="输入关键词搜索..."
        className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-subtle)] focus:border-[var(--brand)]"
      />

      <select
        name="tag"
        defaultValue={defaultTag ?? ""}
        className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)]"
      >
        <option value="">全部标签</option>
        {availableTags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-medium text-white transition hover:bg-[var(--brand-strong)]"
      >
        筛选
      </button>
    </form>
  );
}
