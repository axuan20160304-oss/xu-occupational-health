"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 sm:px-12 sm:py-16">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--brand-soft),transparent_70%)] opacity-60" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)] opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--brand-muted)] to-transparent opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-3xl"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-1.5 text-xs font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-[var(--text-muted)]">职业病专业知识平台</span>
          <span className="text-[var(--text-subtle)]">·</span>
          <span className="text-[var(--brand)]">AI 驱动自动更新</span>
        </div>
        <h1 className="text-balance text-3xl font-bold leading-[1.2] tracking-tight text-[var(--text-primary)] sm:text-5xl">
          面向职业病防治专业人员的
          <span className="text-gradient"> 智能知识中枢</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
          聚合 GBZ 职业健康标准、法律法规、实务经验与多媒体知识材料。
          通过 OpenClaw AI 自动搜索、整合并推送最新内容，助力职业健康团队高效决策。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/standards"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ background: "var(--gradient-brand)" }}
          >
            浏览标准法规
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            专业文章
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
