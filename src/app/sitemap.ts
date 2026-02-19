import type { MetadataRoute } from "next";
import { getContentList } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [articles, laws] = await Promise.all([
    getContentList("articles"),
    getContentList("laws"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/laws",
    "/articles",
    "/standards",
    "/resources",
    "/about",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/articles/${article.slug}`,
    lastModified: new Date(article.date),
  }));

  const lawRoutes: MetadataRoute.Sitemap = laws.map((law) => ({
    url: `${baseUrl}/laws/${law.slug}`,
    lastModified: new Date(law.date),
  }));

  return [...staticRoutes, ...articleRoutes, ...lawRoutes];
}
