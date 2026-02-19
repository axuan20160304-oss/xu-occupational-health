"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      {/* Dot grid background */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-40" />
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--brand)] opacity-[0.04] blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.06] blur-[80px]" />
      {/* Top highlight line */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent opacity-20" />

      <div className="relative px-6 py-16 sm:px-12 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Status badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3.5 py-1.5 text-[12px] shadow-[var(--shadow-xs)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
            </span>
            <span className="font-medium text-[var(--brand)]">AI 驱动</span>
          </div>

          {/* Heading */}
          <h1 className="text-balance text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[52px]">
            面向职业病防治专业人员的
            <br />
            <span className="text-gradient">智能知识中枢</span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-[1.8] text-[var(--text-muted)] sm:text-[17px]">
            整合标准法规、专业文章、图片资料和PPT课件，为职业病防治工作者提供全方位的知识支持
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/standards"
              className="group inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-6 py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]"
              style={{ background: "var(--gradient-brand)" }}
            >
              浏览标准法规
              <svg className="transition-transform group-hover:translate-x-0.5" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border-2 border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-[14px] font-semibold text-[var(--text-primary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              专业文章
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
