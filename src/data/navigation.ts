export interface NavigationItem {
  href: string;
  label: string;
}

export const mainNavigation: NavigationItem[] = [
  { href: "/", label: "首页" },
  { href: "/laws", label: "法律法规" },
  { href: "/articles", label: "专业文章" },
  { href: "/standards", label: "GBZ速查" },
  { href: "/resources", label: "工具资源" },
  { href: "/about", label: "关于" },
];

export const quickAccessCards = [
  {
    title: "法律法规更新",
    description: "查看最新职业病防治法律、标准与规范更新。",
    href: "/laws",
    badge: "OpenClaw 自动同步",
  },
  {
    title: "专业文章库",
    description: "沉淀职业病诊疗、健康监护与案例研究内容。",
    href: "/articles",
    badge: "支持 NotebookLM 生成",
  },
  {
    title: "GBZ 188 速查",
    description: "按危害因素快速定位检查项目、周期与禁忌证。",
    href: "/standards",
    badge: "临床工作高频",
  },
  {
    title: "多媒体资料",
    description: "支持图片、PDF、PPT、思维导图与音频摘要展示。",
    href: "/resources",
    badge: "API 媒体对接",
  },
] as const;
