import type { ReactNode } from "react";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: SectionTitleProps) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[var(--brand)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
