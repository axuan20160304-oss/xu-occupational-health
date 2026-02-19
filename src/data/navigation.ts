export interface NavigationItem {
  href: string;
  label: string;
}

export const mainNavigation: NavigationItem[] = [
  { href: "/", label: "首页" },
  { href: "/standards", label: "标准法规" },
  { href: "/articles", label: "专业文章" },
  { href: "/images", label: "图片资料" },
  { href: "/ppts", label: "PPT课件" },
];

export const quickAccessCards = [
  {
    title: "GBZ标准与法规",
    description: "GBZ职业健康标准、法律法规全文，支持PDF在线预览与下载。",
    href: "/standards",
    badge: "OpenClaw 自动同步",
  },
  {
    title: "专业文章库",
    description: "职业病诊疗、健康监护与案例研究，AI整合专业内容。",
    href: "/articles",
    badge: "OpenClaw 生成",
  },
  {
    title: "图片资料库",
    description: "职业健康相关图片资料，支持在线预览与高清下载。",
    href: "/images",
    badge: "NotebookLM 生成",
  },
  {
    title: "PPT课件库",
    description: "职业健康培训课件与演示文稿，支持预览与下载。",
    href: "/ppts",
    badge: "NotebookLM 生成",
  },
] as const;
