import { MDXRemote } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";

interface MdxContentProps {
  source: string;
}

const components = {
  h1: (props: { children: ReactNode }) => (
    <h1 className="mt-8 text-3xl font-semibold text-[var(--text-primary)]" {...props} />
  ),
  h2: (props: { children: ReactNode }) => (
    <h2 className="mt-8 text-2xl font-semibold text-[var(--text-primary)]" {...props} />
  ),
  h3: (props: { children: ReactNode }) => (
    <h3 className="mt-6 text-xl font-semibold text-[var(--text-primary)]" {...props} />
  ),
  p: (props: { children: ReactNode }) => (
    <p className="mt-4 leading-8 text-[var(--text-muted)]" {...props} />
  ),
  ul: (props: { children: ReactNode }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-[var(--text-muted)]" {...props} />
  ),
  ol: (props: { children: ReactNode }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[var(--text-muted)]" {...props} />
  ),
  li: (props: { children: ReactNode }) => <li className="leading-7" {...props} />,
  blockquote: (props: { children: ReactNode }) => (
    <blockquote
      className="mt-6 border-l-4 border-[var(--brand)] bg-[var(--surface-alt)] px-4 py-3 text-[var(--text-muted)]"
      {...props}
    />
  ),
  code: (props: { children: ReactNode }) => (
    <code className="rounded bg-[var(--surface-alt)] px-1.5 py-0.5 text-sm" {...props} />
  ),
};

export function MdxContent({ source }: MdxContentProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <MDXRemote source={source} components={components} />
    </article>
  );
}
