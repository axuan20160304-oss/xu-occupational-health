"use client";

import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-8 shadow-[0_24px_80px_-32px_var(--brand-soft)] sm:rounded-3xl sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute -left-28 top-[-42px] h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--brand-soft),transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-28 right-[-42px] h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_74%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-3xl"
      >
        <p className="mb-4 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--brand)]">
          职业病专业知识平台 · API 自动更新
        </p>
        <h1 className="text-balance text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-5xl">
          面向职业病防治从业人员的
          <span className="text-[var(--brand)]"> 法规、标准与案例知识中枢</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
          聚合职业病法律法规、GBZ 标准、实务经验与多媒体知识材料，
          支持通过 OpenClaw 与 NotebookLM 等工具 API 自动更新内容，
          帮助职业健康团队持续获取高质量、可执行的信息。
        </p>
      </motion.div>
    </section>
  );
}
